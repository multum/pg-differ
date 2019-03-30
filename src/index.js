/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const R = require('ramda')
const utils = require('./utils')

const Sql = require('./sql')
const Logger = require('./logger')
const Client = require('./postgres-client')
const Model = require('./model')

const _defaultOptions = {
  logging: false,
  schemaFolder: null,
  seedFolder: null,
  dbConfig: null,
  force: false,
}

const _getSchemas = ({ filePattern, pathFolder, placeholders }) => (
  fs.readdirSync(pathFolder)
    .filter((file) => filePattern.test(file))
    .map((file) => (
      utils.loadJSON(
        path.resolve(pathFolder, file),
        placeholders,
      )
    ))
)

const _calculateSuccessfulInsets = R.ifElse(
  R.is(Array),
  R.reduce((acc, insert) => acc + insert.rowCount, 0),
  R.prop('rowCount'),
)

module.exports = function Differ (options) {
  options = { ..._defaultOptions, ...options }
  const {
    schemaFolder,
    seedFolder,
    placeholders,
    force,
    dbConfig,
  } = options

  let logging

  if (options.logging) {
    if (typeof options.logging === 'function') {
      logging = options.logging
    } else {
      logging = console.info
    }
  } else {
    logging = false
  }

  const logger = new Logger({ prefix: 'pg-differ', callback: logging })

  const _client = new Client(dbConfig)
  const _models = new Map()

  const _getDatabaseVersion = async () => {
    const { rows: [ row ] } = await _client.query('select version()')
    const version = row.version.match(/[0-9]+.[0-9]+/)
    return version ? Number(version[0]) : null
  }

  const _setup = async () => {
    if (schemaFolder) {
      const schemas = _getSchemas({
        placeholders,
        pathFolder: schemaFolder,
        filePattern: /^.*\.schema.json$/,
      })
      schemas.map(_define)
      _installTableDependencies()
      if (await _supportSeeds()) {
        _initSeeds()
      } else {
        logger.warn(`For Seeds need a PostgreSQL server v9.5 or more`)
      }
    }
  }

  const _supportSeeds = async () => {
    const version = await _getDatabaseVersion()
    return version >= 9.5
  }

  const _initSeeds = () => {
    const localSeeds = _getSeeds()
    localSeeds.forEach((seeds, table) => {
      const model = _models.get(table)
      model && model.addSeeds(seeds)
    })
  }

  const _getSeeds = () => {
    const result = new Map()
    if (seedFolder) {
      const seeds = _getSchemas({
        pathFolder: seedFolder,
        placeholders,
        filePattern: /^.*\.seeds.json$/,
      })
      seeds.forEach(({ table, seeds }) => {
        if (result.has(table)) {
          result.set(table, [ ...result.get(table), ...seeds ])
        } else {
          result.set(table, seeds)
        }
      })
    }
    return result
  }
  const _define = (schema) => {
    const model = new Model({
      client: _client,
      schema,
      force,
      logging,
    })
    _models.set(schema.table, model)
  }

  const define = (schema) => {
    const model = _define(schema)
    _installTableDependencies()
    return model
  }

  const _installTableDependencies = () => (
    _models.forEach((model) => {
      const { indexes } = model._getSchema()
      indexes.forEach(({ type, references }) => {
        if (type === 'foreignKey' && _models.has(references.table)) {
          const ref = _models.get(references.table)
          ref._belongsTo(model)
        }
      })
    })
  )

  const _getSqlCreateOrAlterTable = (models) => (
    Promise.all(
      models.map((model) => model._getSqlCreateOrAlterTable()),
    ).then(
      R.pipe(
        R.map((sql) => sql.getLines()),
        R.unnest,
      ),
    )
  )

  const _getSqlConstraintChanges = async (models) => {
    let dropForeignKey = []
    let dropConstraints = []
    let deleteRows = []
    let setUnique = []
    let allOperations = []

    const lines = await Promise.all(models.map((model) => model._getSqlConstraintChanges()))

    lines.forEach((sql) => {
      dropForeignKey = [ ...dropForeignKey, ...sql.getLines([ 'drop foreignKey' ]) ]
      dropConstraints = [ ...dropConstraints, ...sql.getLines([ 'drop primaryKey', 'drop unique' ]) ]
      deleteRows = [ ...deleteRows, ...sql.getLines([ 'delete rows' ]) ]
      setUnique = [ ...setUnique, ...sql.getLines([ 'add unique' ]) ]
      allOperations = [ ...allOperations, ...sql.getLines() ]
    })

    return [
      ...dropForeignKey,
      ...dropConstraints,
      ...deleteRows,
      ...setUnique,
      ...allOperations,
    ]
  }

  const _getSeedSql = R.pipe(
    R.map((model) => {
      const sql = model._getSqlInsertSeeds()
      return sql && sql.getLines()
    }),
    R.filter(Boolean),
    R.unnest,
  )

  const sync = async () => {
    logger.info(chalk.green('Sync start'), null)

    const models = Array.from(_models.values())

    const createOrAlterQueries = Sql.joinUniqueQueries(await _getSqlCreateOrAlterTable(models))
    if (createOrAlterQueries) {
      logger.info('Start sync tables with...', createOrAlterQueries)
      await _client.query(createOrAlterQueries)
      logger.info('End sync tables', null)
    }

    const constraintQueries = Sql.joinUniqueQueries(await _getSqlConstraintChanges(models))
    if (constraintQueries) {
      logger.info(`Start sync table ${chalk.green('constraints')} with...`, constraintQueries)
      await _client.query(constraintQueries)
      logger.info(`End sync table ${chalk.green('constraints')}`, null)
    }

    let insertSeedCount = 0
    if (await _supportSeeds()) {
      const insertSeedQueries = Sql.joinUniqueQueries(_getSeedSql(models))
      if (insertSeedQueries) {
        logger.info(`Start sync table ${chalk.green('seeds')}`, null)
        insertSeedCount = _calculateSuccessfulInsets(await _client.query(insertSeedQueries))
        logger.info(`Seeds were inserted: ${chalk.green(insertSeedCount)}`, null)
      }
    }

    if (!createOrAlterQueries && !constraintQueries && insertSeedCount === 0) {
      logger.info('Tables do not need structure synchronization', null)
    }

    logger.info(chalk.green('Sync end'), null)
    return _client.end()
  }

  const getModel = (name) => _models.get(name)

  _setup()

  return Object.freeze({
    sync,
    define,
    getModel,
  })
}
