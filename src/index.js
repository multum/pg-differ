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
      schemas.map(define)
      _installTableDependencies()
      if (await _supportSeeds()) {
        _initSeeds()
      } else {
        log(chalk.yellow(`Warning: For Seeds need a PostgreSQL server v9.5 or more`))
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

  const log = (title, message) => {
    if (logging) {
      title = title && `----- Postgres Differ: ${title} -----`
      const string = [ title, message ].filter(utils.isExist).join('\n')
      logging(string)
    }
  }

  const define = (schema) => {
    const model = new Model({
      client: _client,
      schema,
      force,
      log,
    })
    _models.set(schema.table, model)
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
    let allOperations = []

    const lines = await Promise.all(models.map((model) => model._getSqlConstraintChanges()))

    lines.forEach((sql) => {
      dropForeignKey = [ ...dropForeignKey, ...sql.getLines([ 'drop foreignKey' ]) ]
      dropConstraints = [ ...dropConstraints, ...sql.getLines([ 'drop primaryKey', 'drop unique' ]) ]
      allOperations = [ ...allOperations, ...sql.getLines() ]
    })

    return [
      ...dropForeignKey,
      ...dropConstraints,
      ...allOperations,
    ]
  }

  const _getSeedSql = R.pipe(
    R.map((model) => model._getSqlInsertSeeds().getLines()),
    R.unnest,
  )

  const sync = async () => {
    log(chalk.green('Sync start'))

    const models = Array.from(_models.values())

    const createOrAlterQueries = Sql.joinUniqueQueries(await _getSqlCreateOrAlterTable(models))
    if (createOrAlterQueries) {
      log('Start sync tables with...', createOrAlterQueries)
      await _client.query(createOrAlterQueries)
      log('End sync tables')
    }

    const constraintQueries = Sql.joinUniqueQueries(await _getSqlConstraintChanges(models))
    if (constraintQueries) {
      log(`Start sync table ${chalk.green('constraints')} with...`, constraintQueries)
      await _client.query(constraintQueries)
      log(`End sync table ${chalk.green('constraints')}`)
    }

    let insertSeedCount = 0
    if (await _supportSeeds()) {
      const insertSeedQueries = Sql.joinUniqueQueries(_getSeedSql(models))
      if (insertSeedQueries) {
        log(`Start sync table ${chalk.green('seeds')}`)
        insertSeedCount = _calculateSuccessfulInsets(await _client.query(insertSeedQueries))
        log(`Seeds were inserted: ${chalk.green(insertSeedCount)}`)
      }
    }

    if (!createOrAlterQueries && !constraintQueries && insertSeedCount === 0) {
      log('Tables do not need structure synchronization')
    }

    log(chalk.green('Sync end'))
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
