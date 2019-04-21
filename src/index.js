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

const { ORDER_OF_OPERATIONS } = require('./constants/constraints')

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

  const logger = new Logger({ prefix: 'Postgres Differ', callback: logging })

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
      seeds.forEach(({ type, properties: { table, rows } }) => {
        if (type === 'seeds') {
          if (result.has(table)) {
            result.set(table, [ ...result.get(table), ...rows ])
          } else {
            result.set(table, rows)
          }
        }
      })
    }
    return result
  }

  const define = (schema) => {
    const model = new Model({
      client: _client,
      schema,
      force,
      logging,
    })
    _models.set(schema.table, model)
    return model
  }

  const _awaitAndUnnestSqlLines = R.pipe(
    (promises) => Promise.all(promises),
    R.then(
      R.pipe(
        R.filter(Boolean),
        R.map((sql) => sql.getLines()),
        R.unnest,
      ),
    ),
  )

  const _getSqlCreateOrAlterTable = R.pipe(
    R.map((model) => model._getSqlCreateOrAlterTable()),
    _awaitAndUnnestSqlLines,
  )

  const _getSqlConstraintChanges = R.pipe(
    R.map((model) => model._getSqlConstraintChanges()),
    (promises) => Promise.all(promises),
    R.then(
      R.pipe(
        R.map((sql) => sql.getStore()),
        R.unnest,
        utils.sortByList(
          R.prop('operation'),
          ORDER_OF_OPERATIONS,
        ),
        R.map(R.prop('value')),
      ),
    ),
  )

  const _getSeedSql = R.pipe(
    R.map((model) => model._getSqlInsertSeeds()),
    _awaitAndUnnestSqlLines,
  )

  const _getSqlSequenceChanges = R.pipe(
    R.map((model) => model._getSqlSequenceChanges()),
    _awaitAndUnnestSqlLines,
  )

  const _entitySync = async (entity, promise) => {
    const sql = Sql.joinUniqueQueries(await promise)
    if (sql) {
      logger.info(`Start sync ${chalk.green(entity)} with...`, sql)
      const result = await _client.query(sql)
      logger.info(`End sync ${chalk.green(entity)}`, null)
      return result
    } else {
      return null
    }
  }

  const sync = async () => {
    const models = Array.from(_models.values())

    logger.info(chalk.green('Sync start'), null)

    const sequenceChanges = await _entitySync('sequences', _getSqlSequenceChanges(models))
    const createOrAlterQueries = await _entitySync('tables', _getSqlCreateOrAlterTable(models))
    const constraintQueries = await _entitySync('constraints', _getSqlConstraintChanges(models))
    let insertSeedCount = 0

    if (await _supportSeeds()) {
      const insertSeedQueries = Sql.joinUniqueQueries(await _getSeedSql(models))
      if (insertSeedQueries) {
        logger.info(`Start sync table ${chalk.green('seeds')}`, null)
        insertSeedCount = _calculateSuccessfulInsets(await _client.query(insertSeedQueries))
        logger.info(`Seeds were inserted: ${chalk.green(insertSeedCount)}`, null)
      }
    }

    if (!sequenceChanges && !createOrAlterQueries && !constraintQueries && insertSeedCount === 0) {
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
