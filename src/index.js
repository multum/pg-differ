const fs = require('fs')
const path = require('path')
const utils = require('./utils')

const Sql = require('./sql')
const Client = require('./postgres-client')
const Model = require('./model')

const _defaultOptions = {
  logging: false,
  schemaFolder: null,
  logger: console.info,
  dbConfig: null,
  force: false,
}

const _loadJSON = (path, placeholders) => {
  let file = fs.readFileSync(path, 'utf-8')
  if (placeholders) {
    Object.entries(placeholders).forEach(([ name, value ]) => {
      const regExp = `\\$\{${name}\\}`
      file = file.replace(new RegExp(regExp, 'g'), value)
    })
  }
  return JSON.parse(file)
}

const _getSchemas = (pathFolder, placeholders) => (
  fs.readdirSync(pathFolder)
    .filter((file) => /^.*\.schema.json$/.test(file))
    .map((file) => (
      _loadJSON(
        path.resolve(pathFolder, file),
        placeholders,
      )
    ))
)

/**
 * @typedef {object} Differ
 * @property {function} sync
 * @property {function} define
 */

/**
 *
 * @param {object} options
 * @param {object} options.dbConfig
 * @param {string=} options.schemaFolder
 * @param {object=} options.placeholders
 * @param {boolean=} options.logging
 * @param {function=} options.logger
 * @param {boolean=} options.force
 * @returns {Differ}
 */
module.exports = function (options) {
  options = { ..._defaultOptions, ...options }
  const _client = new Client(options.dbConfig)
  const _models = new Map()

  const _defineModels = () => {
    const { schemaFolder, placeholders } = options
    if (schemaFolder) {
      const schemas = _getSchemas(schemaFolder, placeholders)
      return schemas && utils.notEmpty(schemas)
        ? schemas.map(define)
        : null
    }
  }

  const logger = (title, ...args) => {
    if (options.logging) {
      title && options.logger(`\n\n----- Postgres Differ: ${title} -----`)
      args.length && options.logger('\n', ...args)
    }
  }

  const _setup = () => {
    _defineModels()
  }

  const define = (schema) => {
    const { force } = options
    const model = new Model({
      client: _client,
      schema,
      logger,
      force,
    })
    const { table } = model.getSchema()
    _models.set(table, model)
    _installTableDependencies()
    return model
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

  const _getSyncSql = async (models) => {
    const sql = await Promise.all(
      models.map((model) => model.getSyncSql()),
    )
    return sql
      .filter(Boolean)
      .reduce((acc, sql) => acc.concat(sql.getLines()), [])
  }

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

  const sync = async () => {
    logger(`Sync start`)

    const models = Array.from(_models.values())

    const syncQueries = Sql.uniqueQueries(await _getSyncSql(models))
    if (syncQueries) {
      logger('Start sync tables with...', syncQueries)
      await _client.find(syncQueries)
      logger('End sync tables')
    }

    const constraintQueries = Sql.uniqueQueries(await _getConstraintsSql(models))
    if (constraintQueries) {
      logger('Start sync table constraints with...', constraintQueries)
      await _client.find(constraintQueries)
      logger('End sync table constraints')
    }

    if (!syncQueries && !constraintQueries) {
      logger('Tables do not need synchronization')
    }

    logger(`Sync end`)
    return _client.end()
  }

  _setup()

  return Object.freeze({
    sync,
    define,
  })
}
