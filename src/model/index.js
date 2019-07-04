/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const R = require('ramda')
const Sql = require('../sql')
const Seeds = require('./seeds')
const Sequence = require('../sequence')
const Logger = require('../logger')

const queries = require('../queries/model')
const utils = require('../utils')
const parser = require('../parser')
const { COLUMNS, TYPES } = require('../constants')

const validate = require('../validate')

const _parseSchema = R.pipe(
  validate.model,
  parser.schema,
)

const _setupSequences = ({ columns, tableName, schemaName, client, forceCreate }) => {
  const sequenceColumns = columns.filter(R.prop('autoIncrement'))
  if (sequenceColumns.length) {
    return sequenceColumns.map((column) => {
      const { autoIncrement: properties } = column
      const sequence = new Sequence({
        client,
        properties: {
          name: `${schemaName}.${tableName}_${column.name}_seq`,
          force: forceCreate,
          ...properties,
          columnUses: column.name,
        },
      })
      column.default = sequence._getQueryIncrement()
      return sequence
    })
  }
}

const _defaultExtensions = {
  primaryKey: [],
  foreignKey: [],
  check: [],
  unique: [],
  index: [],
}

module.exports = function (options) {
  const { client, force, schema, logging } = options

  let _dbExtensions = { ..._defaultExtensions }

  const _schema = _parseSchema(schema)
  const _table = _schema.name
  const [ _schemaName = 'public', _tableName ] = parser.separateSchema(_table)

  const _cleanable = _schema.cleanable
  const _primaryKey = R.path([ 'primaryKey', 0 ], _schema.extensions)
  const _forceCreate = R.isNil(_schema.force) ? force : _schema.force
  const _hasConstraint = _primaryKey || R.path([ 'unique', 0 ], _schema.extensions)

  const _seeds = new Seeds({
    table: _table,
  })

  const logger = new Logger({ prefix: `Postgres Differ [ '${_table}' ]`, callback: logging })

  const _sequences = _setupSequences({
    client,
    tableName: _tableName,
    schemaName: _schemaName,
    columns: _schema.columns,
    forceCreate: _forceCreate,
  })

  const _getProperties = () => ({ ..._schema })

  const _fetchColumns = async () => (
    client.query(
      queries.getColumns(_schemaName, _tableName),
    ).then(
      R.pipe(
        R.prop('rows'),
        parser.dbColumns(_schemaName),
      ),
    )
  )

  const _fetchConstraints = async (table = _table) => {
    await client.query('savepoint temp_search_path')
    await client.query(queries.publicSearchPath())
    const constraints = await client.query(
      queries.getConstraints(table),
    ).then(
      R.pipe(
        R.prop('rows'),
        parser.extensionDefinitions,
        R.groupBy(R.prop('type')),
      ),
    )
    await client.query('rollback to savepoint temp_search_path')
    return constraints
  }

  const _fetchIndexes = () => (
    client.query(
      queries.getIndexes(_schemaName, _tableName),
    ).then(
      R.pipe(
        R.prop('rows'),
        parser.indexDefinitions,
      ),
    )
  )

  /**
   *  Database extension structure
   */
  const _fetchAllExtensions = async () => {
    const [ constraints, index ] = await Promise.all([
      _fetchConstraints(),
      _fetchIndexes(),
    ])
    _dbExtensions = {
      ..._defaultExtensions,
      ...constraints,
      index,
    }
    return _dbExtensions
  }

  const _tableExist = (schema, table) => (
    client.query(
      queries.tableExist(schema, table),
    ).then(R.path([ 'rows', 0, 'exists' ]))
  )

  const _getSqlCreateOrAlterTable = async () => {
    let sqlCreateOrAlterTable

    if (_forceCreate) {
      sqlCreateOrAlterTable = _createTable({ force: true })
    } else {
      if (await _tableExist(_schemaName, _tableName)) {
        await _fetchAllExtensions()
        sqlCreateOrAlterTable = await _getSQLColumnChanges()
      } else {
        sqlCreateOrAlterTable = _createTable({ force: false })
      }
    }
    if (_cleanable.check || utils.notEmpty(schema.checks)) {
      const [
        dropQueries = [],
        addQueries = [],
      ] = await _getCheckChanges(schema.checks || [])
      return new Sql([
        ...dropQueries,
        ...sqlCreateOrAlterTable.getStore(),
        ...addQueries,
      ])
    }

    return sqlCreateOrAlterTable
  }

  const _getColumnDifferences = (dbColumns, schemaColumns) => (
    schemaColumns
      .map((column) => {
        const dbColumn = utils.findByName(dbColumns, column.name, column.formerNames)
        if (dbColumn) {
          const diff = _getColumnAttributeDiffs(column, dbColumn)
          return diff && utils.notEmpty(diff)
            ? { ...column, diff }
            : null
        } else {
          return column
        }
      })
      .filter(Boolean)
  )

  const _findExtensionWhere = (extensions, props) => {
    const { columns } = props
    if (columns && R.isEmpty(columns)) {
      return null
    }
    return extensions && extensions.find(R.whereEq(props))
  }

  const _getDropExtensionQueries = (extensions, excludeNames) => R.pipe(
    R.values,
    R.unnest,
    R.filter(({ type, name }) => (
      _cleanable[type] && !excludeNames.includes(name)
    )),
    R.map(_dropExtension),
  )(extensions)

  const _getSQLColumnChanges = async () => {
    const dbColumns = await _fetchColumns()
    const sql = new Sql()
    const differences = _getColumnDifferences(dbColumns, _schema.columns)
    if (utils.notEmpty(differences)) {
      differences.forEach((column) => {
        const { diff } = column
        if (diff) {
          const keys = utils.sortByList(null, COLUMNS.ATTRS, Object.keys(diff))
          keys.forEach((key) => {
            const alterQuery = _alterColumn(column, key)
            alterQuery && sql.add(alterQuery)
          })
        } else {
          sql.add(_addColumn(column))
        }
      })
    }
    return sql
  }

  const _normalizeCheckRows = async (rows) => {
    const getConstraintName = (id) => `temp_constraint_check_${id}`
    const tempTableName = `temp_${_tableName}`

    const createQueries = _createTable({ table: tempTableName, temp: true, force: false })
    await client.query(createQueries.join())

    const sql = rows.reduce((acc, { condition }, i) => (
      acc.add(_addExtension(
        tempTableName,
        { type: 'check', name: getConstraintName(i), condition },
      ))
    ), new Sql())

    await client.query(sql.join())

    const { check: dbChecks } = await _fetchConstraints(tempTableName)
    await client.query(`drop table ${tempTableName};`)

    return rows.map((_, i) => ({
      type: 'check',
      condition: dbChecks.find(({ name }) => name === getConstraintName(i)).condition,
    }))
  }

  const _getCheckChanges = async (rows) => (
    _getExtensionChangesOf(
      { check: _dbExtensions.check },
      await _normalizeCheckRows(rows),
    )
  )

  const _getExtensionChangesOf = (dbExtensions, schemaExtensions) => {
    const adding = []
    const excludeDrop = []
    R.forEachObjIndexed(
      R.when(
        utils.notEmpty,
        R.forEach((extension) => {
          const { type } = extension
          const dbExtension = _findExtensionWhere(dbExtensions[type], extension)
          if (dbExtension) {
            excludeDrop.push(dbExtension.name)
          } else {
            adding.push(_addExtension(_table, extension))
          }
        }),
      ),
      schemaExtensions,
    )
    return [
      _getDropExtensionQueries(dbExtensions, excludeDrop),
      adding,
    ]
  }

  const _getSqlExtensionChanges = async () => {
    await _fetchAllExtensions()
    return new Sql(
      R.unnest(_getExtensionChangesOf(
        R.omit([ 'check' ], _dbExtensions),
        _schema.extensions,
      )),
    )
  }

  const _addColumn = (column) => (
    Sql.create(
      'add column',
      `alter table ${_table} add column ${_getColumnDescription(column)};`,
    )
  )

  const _addExtension = (table, extension) => {
    let { type, columns = [], references, onDelete, onUpdate, match, condition, name } = extension
    const alterTable = `alter table ${table}`
    const extensionType = parser.encodeExtensionType(type)

    const addExtension = Sql.create(`add ${type}`)
    columns = columns.join(',')
    switch (type) {
      case 'index':
        return Sql.create(`create ${type}`, `create ${extensionType} on ${table} (${columns});`)

      case 'primaryKey':
        return addExtension(`${alterTable} add ${extensionType} (${columns});`)

      case 'unique':
        return addExtension(`${alterTable} add ${extensionType} (${columns});`)

      case 'foreignKey': {
        match = match ? ` match ${match}` : null
        references = `references ${references.table} (${references.columns.join(',')})`
        const events = `on update ${onUpdate} on delete ${onDelete}`
        return addExtension(`${alterTable} add ${extensionType} (${columns}) ${references}${match} ${events};`)
      }

      case 'check': {
        const constraintName = name ? ` constraint ${name}` : ''
        return addExtension(`${alterTable} add${constraintName} ${extensionType} (${condition});`)
      }

      default:
        return null
    }
  }

  const _dropExtension = (extension) => {
    const alterTable = `alter table ${_table}`
    if (extension.type === 'index') {
      return Sql.create(`drop ${extension.type}`, `drop index ${_schemaName}.${extension.name};`)
    }
    return Sql.create(`drop ${extension.type}`, `${alterTable} drop constraint ${extension.name};`)
  }

  const _alterColumn = (column, key) => {
    const value = column.diff[key]
    const alterTable = `alter table ${_table}`
    if (key === 'name') {
      const { oldName, name } = column.diff
      return Sql.create('rename column', `${alterTable} rename column ${oldName} to ${name};`)
    } else if (key === 'nullable') {
      if (value === true) {
        if (_shouldBePrimaryKey(column.name)) {
          logger.error(
            `Error setting '${column.name}.nullable = true'. ` +
            `'${column.name}' is primaryKey`,
          )
        } else {
          let dropPrimaryKey = null
          const primaryKey = _dbExtensions.primaryKey[0]
          if (primaryKey && R.includes(column.name, primaryKey.columns)) {
            if (_cleanable.primaryKey) {
              dropPrimaryKey = _dropExtension(primaryKey)
            } else {
              logger.error(
                `Error setting '${column.name}.nullable = true'. ` +
                `You need to add 'cleanable.primaryKeys: true'`,
              )
              return null
            }
          }
          return [
            dropPrimaryKey,
            Sql.create('drop not null', `${alterTable} alter column ${column.name} drop not null;`),
          ]
        }
      } else {
        const setValues = column.default ? Sql.create(
          'set values by defaults',
          `update ${_table} set ${column.name} = ${column.default} where ${column.name} is null;`,
        ) : null
        return [
          setValues,
          Sql.create('set not null', `${alterTable} alter column ${column.name} set not null;`),
        ]
      }
    } else if (key === 'type' || key === 'collate') {
      const { oldType, type } = column.diff
      const oldTypeGroup = parser.getTypeGroup(oldType)
      const newTypeGroup = parser.getTypeGroup(type)
      const { INTEGER, CHARACTER, BOOLEAN } = TYPES.GROUPS
      const collate = column.collate ? ` collate "${column.collate}"` : ''

      // If not an array
      if (type.indexOf(']') === -1) {
        const alterColumnType = (using) => {
          using = using ? ` using (${using})` : ''
          return Sql.create('set type', `${alterTable} alter column ${column.name} type ${column.type}${collate}${using};`)
        }
        if (
          !oldType ||
          (oldTypeGroup === INTEGER && newTypeGroup === INTEGER) ||
          (oldTypeGroup === CHARACTER && newTypeGroup === CHARACTER) ||
          (oldTypeGroup === INTEGER && newTypeGroup === CHARACTER)
        ) {
          return alterColumnType()
        } else if (oldTypeGroup === CHARACTER && newTypeGroup === INTEGER) {
          return alterColumnType(`trim(${column.name})::integer`)
        } else if (oldTypeGroup === BOOLEAN && newTypeGroup === INTEGER) {
          return alterColumnType(`${column.name}::integer`)
        } else if (oldTypeGroup === INTEGER && newTypeGroup === BOOLEAN) {
          return alterColumnType(`case when ${column.name} = 0 then false else true end`)
        }
      }

      return column.force === true
        ? Sql.create(
          'drop and add column',
          `${alterTable} drop column ${column.name}, add column ${_getColumnDescription(column)};`)
        : logger.error(
          `To changing the type '${oldType}' => '${type}' you need to set 'force: true' for '${column.name}' column`,
        )
    } else if (key === 'default') {
      if (utils.isExist(value)) {
        return Sql.create('set default', `${alterTable} alter column ${column.name} set default ${value};`)
      } else {
        return Sql.create('set default', `${alterTable} alter column ${column.name} drop default;`)
      }
    }
    return null
  }

  const _shouldBePrimaryKey = (names) => {
    if (_primaryKey) {
      return R.is(Array, names)
        ? R.equals(names, _primaryKey.columns)
        : R.includes(names, _primaryKey.columns)
    } else {
      return false
    }
  }

  const _getColumnDescription = (column) => {
    const chunks = [ `${column.name} ${column.type}` ]

    if (column.collate) {
      chunks.push(`collate "${column.collate}"`)
    }

    if (column.default != null) {
      chunks.push(`default ${column.default}`)
    }

    if (column.nullable && !_shouldBePrimaryKey(column.name)) {
      chunks.push('null')
    } else {
      chunks.push('not null')
    }

    if (column.primaryKey) {
      chunks.push('primary key')
    }

    if (column.unique) {
      chunks.push('unique')
    }

    return chunks.join(' ')
  }

  const _createTable = ({ table = _table, columns = _schema.columns, force, temp }) => {
    columns = columns
      .map(_getColumnDescription)
      .join(',\n\t')
    temp = temp ? ' temporary' : ''
    return new Sql([
      force ? Sql.create('drop table', `drop table if exists ${table} cascade;`) : null,
      Sql.create('create table', `create${temp} table ${table} (\n\t${columns}\n);`),
    ])
  }

  const _getColumnAttributeDiffs = (column, dbColumn) => (
    COLUMNS.ATTRS.reduce((acc, key) => {
      const dbValue = dbColumn[key]
      const schemaValue = column[key]
      if (String(dbValue) !== String(schemaValue)) {
        acc[key] = schemaValue
        switch (key) {
          case 'type': {
            acc['oldType'] = dbValue
            break
          }
          case 'name': {
            acc['oldName'] = dbValue
            break
          }
        }
      }
      return acc
    }, {})
  )

  const addSeeds = (seeds) => {
    if (_hasConstraint) {
      _seeds.add(seeds)
    } else {
      logger.error(`To use seeds, you need to set at least one constraint (primaryKey || unique)`)
    }
  }

  if (_schema.seeds) {
    addSeeds(_schema.seeds)
  }

  const _getSqlInsertSeeds = () => {
    if (_seeds.size()) {
      const inserts = _seeds.inserts()
      return new Sql(inserts.map((insert) => Sql.create('insert seed', insert)))
    }
    return null
  }

  const _getSequences = () => _sequences

  const _getSqlSequenceActualize = async () => {
    if (!(_sequences && _sequences.length)) {
      return null
    }
    const sql = new Sql()
    for (let i = 0; i < _sequences.length; i++) {
      const sequence = _sequences[i]
      const { actual = true, columnUses, min, max } = sequence._getProperties()
      if (actual) {
        const sequenceCurValue = await sequence._getCurrentValue()
        const { rows: [ { max: valueForRestart } ] } = await client.query(
          queries.getMaxValueForRestartSequence(_schemaName, _tableName, columnUses, min, max, sequenceCurValue),
        )
        if (utils.isExist(valueForRestart)) {
          sql.add(Sql.create('sequence restart', sequence._getQueryRestart(valueForRestart)))
        }
      }
    }
    return sql
  }

  return Object.freeze({
    _getSqlCreateOrAlterTable,
    _getSqlExtensionChanges,
    _getSqlInsertSeeds,
    _getSequences,
    _getProperties,
    _getSqlSequenceActualize,
    addSeeds,
  })
}
