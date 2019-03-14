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
  logger: console.info,
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

module.exports = function Differ (options) {
  options = { ..._defaultOptions, ...options }
  const {
    schemaFolder,
    seedFolder,
    placeholders,
    logging,
    force,
    logger,
    dbConfig,
  } = options

  const _client = new Client(dbConfig)
  const _models = new Map()

  const _getDatabaseVersion = async () => {
    let { version } = await _client.findOne('select version()')
    version = version.match(/[0-9]+.[0-9]+/)
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
    _models.forEach((model) => {
      const schema = model.getSchema()
      const tableSeeds = localSeeds.get(schema.table) || []
      const schemaSeeds = schema.seeds || []
      model.addSeeds([ ...schemaSeeds, ...tableSeeds ])
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
      logger(string)
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
    return {
      addSeeds: model.addSeeds,
    }
  }

  const _installTableDependencies = () => (
    _models.forEach((model) => {
      const { indexes } = model.getSchema()
      indexes.forEach(({ type, references }) => {
        if (type === 'foreignKey' && _models.has(references.table)) {
          const ref = _models.get(references.table)
          ref.belongsTo(model)
        }
      })
    })
  )

  const _getSyncSql = (models) => (
    Promise.all(
      models.map((model) => model.getSyncSql()),
    ).then(
      R.pipe(
        R.map((sql) => sql.getLines()),
        R.unnest,
      ),
    )
  )

  const _getConstraintsSql = async (models) => {
    let dropForeignKey = []
    let dropConstraints = []
    let allOperations = []

    const constraintsSql = await Promise.all(models.map((model) => model.getSyncConstraintSQL()))

    constraintsSql.forEach((sql) => {
      dropForeignKey = [ ...dropForeignKey, ...sql.getOperations([ 'drop foreignKey' ]) ]
      dropConstraints = [ ...dropConstraints, ...sql.getOperations([ 'drop primaryKey', 'drop unique' ]) ]
      allOperations = [ ...allOperations, ...sql.getLines() ]
    })

    return [
      ...dropForeignKey,
      ...dropConstraints,
      ...allOperations,
    ]
  }

  const _getSeedSql = R.pipe(
    R.map((model) => model.getSeedSql().getLines()),
    R.unnest,
  )

  const sync = async () => {
    log(chalk.green('Sync start'))

    const models = Array.from(_models.values())

    const syncQueries = Sql.joinUniqueQueries(await _getSyncSql(models))
    if (syncQueries) {
      log('Start sync tables with...', syncQueries)
      await _client.find(syncQueries)
      log('End sync tables')
    }

    const constraintQueries = Sql.joinUniqueQueries(await _getConstraintsSql(models))
    if (constraintQueries) {
      log(`Start sync table ${chalk.green('constraints')} with...`, constraintQueries)
      await _client.find(constraintQueries)
      log(`End sync table ${chalk.green('constraints')}`)
    }

    if (await _supportSeeds()) {
      const seedQueries = Sql.joinUniqueQueries(_getSeedSql(models))
      if (seedQueries) {
        log(`Start sync table ${chalk.green('seeds')}`)
        const result = await _client.query(seedQueries)
        const insertCount = result.reduce((acc, insert) => acc + insert.rowCount, 0)
        log(`Seeds were inserted: ${chalk.green(insertCount)}`)
      }
    }

    if (!syncQueries && !constraintQueries) {
      log('Tables do not need synchronization')
    }

    log(chalk.green('Sync end'))
    return _client.end()
  }

  _setup()

  return Object.freeze({
    sync,
    define,
  })
}
