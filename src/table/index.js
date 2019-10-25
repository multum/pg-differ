/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const R = require('ramda')
const Metalize = require('metalize')
const Sql = require('../sql')
const Seeds = require('./seeds')
const Info = require('./info')
const Sequence = require('../sequence')
const Logger = require('../logger')

const queries = require('./queries')
const utils = require('../utils')
const parser = require('../parser')
const { COLUMNS, TYPES } = require('../constants')

const validate = require('../validate')

const _parseSchema = R.pipe(
  validate.tableDefinition,
  parser.schema,
)

const _setupSequences = ({ columns, tableName, client, forceCreate }) => {
  const sequenceColumns = columns.filter((column) => column.autoIncrement)
  if (sequenceColumns.length) {
    return sequenceColumns.map((column) => {
      const { autoIncrement: properties } = column
      const sequence = new Sequence({
        client,
        properties: {
          name: `${tableName}_${column.name}_seq`,
          force: forceCreate,
          ...properties,
        },
      })
      column.default = sequence._getQueryIncrement()
      return [ column.name, sequence ]
    })
  } else {
    return null
  }
}

function Table (options) {
  const { client, logging } = options

  const _schema = _parseSchema(options.schema)
  const [ _schemaName = 'public', _tableName ] = parser.separateSchema(_schema.name)
  const _fullName = `${_schemaName}.${_tableName}`

  const _cleanable = _schema.cleanable
  const _primaryKey = R.path([ 'primaryKey', 0 ], _schema.extensions)
  const _forceCreate = R.isNil(_schema.force) ? options.force : _schema.force
  const _hasConstraint = _primaryKey || R.path([ 'unique', 0 ], _schema.extensions)

  const _seeds = new Seeds({
    table: _fullName,
  })

  const info = new Info({ client, name: _fullName })

  const logger = new Logger({ prefix: `Postgres Differ [ '${_fullName}' ]`, callback: logging })

  const _sequences = _setupSequences({
    client,
    tableName: _fullName,
    columns: _schema.columns,
    forceCreate: _forceCreate,
  })

  const _getProperties = () => ({ ..._schema })

  const _getExtensions = (structure) => {
    return {
      check: structure.checks,
      primaryKey: structure.primaryKey ? [ structure.primaryKey ] : [],
      foreignKey: structure.foreignKeys,
      index: structure.indexes,
      unique: structure.unique,
    }
  }

  const _getSqlCreateOrAlterTable = (structures) => {
    const structure = structures.get(_fullName)
    if (_forceCreate) {
      return _createTable({ force: true })
    } else {
      if (structure) {
        return _getSQLColumnChanges(structure)
      } else {
        return _createTable({ force: false })
      }
    }
  }

  const _getColumnDifferences = (dbColumns, schemaColumns) => (
    schemaColumns
      .map((column) => {
        const dbColumn = utils.findByName(dbColumns, column.name, column.formerNames)
        if (dbColumn) {
          const diff = _getColumnAttributeDiffs(column, dbColumn)
          return (
            Boolean(diff) && utils.isNotEmpty(diff)
              ? { ...column, diff }
              : null
          )
        } else {
          return column
        }
      })
      .filter(Boolean)
  )

  const _findExtensionWhere = (props, extensions) => (
    extensions && extensions.find(R.whereEq(props))
  )

  const _getDropExtensionQueries = (excludeNames, extensions) => {
    return R.unnest(
      Object.entries(extensions)
        .map(([ type, values ]) => {
          return values
            .filter((extension) => (
              _cleanable[type] && !excludeNames.includes(extension.name)
            ))
            .map((extension) => {
              const alterTable = `alter table ${_fullName}`
              if (type === 'index') {
                return Sql.create(`drop ${type}`, `drop index ${_schemaName}.${extension.name};`)
              }
              return Sql.create(`drop ${type}`, `${alterTable} drop constraint ${extension.name};`)
            })
        }),
    )
  }

  const _getSQLColumnChanges = (structure) => {
    const dbColumns = structure.columns.map((column) => ({
      ...column,
      default: parser.defaultValueInformationSchema(column.default),
    }))
    const sql = new Sql()
    const differences = _getColumnDifferences(dbColumns, _schema.columns)
    if (utils.isNotEmpty(differences)) {
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

  const _normalizeCheckRows = R.memoizeWith(R.identity, async (rows) => {
    if (!rows || R.isEmpty(rows)) {
      return rows
    }

    const getConstraintName = (id) => `temp_constraint_check_${id}`
    const tempTableName = `temp_${_tableName}`

    const createQueries = _createTable({ table: tempTableName, temp: true, force: false })
    await client.query(createQueries.join())

    const sql = rows.reduce((acc, { condition }, i) => (
      acc.add(_addExtension(
        'check',
        tempTableName,
        { name: getConstraintName(i), condition },
      ))
    ), new Sql())

    await client.query(sql.join())

    const dbChecks = await info.getChecks(tempTableName)
    await client.query(`drop table ${tempTableName};`)
    return rows.map((_, i) => ({
      condition: dbChecks.find(({ name }) => name === getConstraintName(i)).condition,
    }))
  })

  const _willBeCreated = (structure) => _forceCreate || !structure

  const _eachExtension = async (resolver, structure) => {
    const willBeCreated = _willBeCreated(structure)
    const existingExtensions = willBeCreated ? null : _getExtensions(structure)
    const schemaChecks = (
      willBeCreated ? _schema.checks : await _normalizeCheckRows(_schema.checks)
    ) || []

    const schemaExtensions = { ..._schema.extensions, check: schemaChecks }
    Object.entries(schemaExtensions)
      .reduce((acc, [ type, values ]) => {
        values.forEach((extension) => {
          const existing = (
            willBeCreated
              ? null
              : _findExtensionWhere(extension, existingExtensions[type])
          )
          resolver(type, existing, extension)
        })
        return acc
      }, [])
    return [ schemaExtensions, existingExtensions ]
  }

  const _getSqlAddingExtensions = async (structures) => {
    const sql = new Sql()
    const structure = structures.get(_fullName)
    await _eachExtension((type, existing, schemaExtension) => {
      !existing && sql.add(_addExtension(type, _fullName, schemaExtension))
    }, structure)
    return sql
  }

  const _getSqlCleaningExtensions = async (structures) => {
    const structure = structures.get(_fullName)
    if (_willBeCreated(structure)) {
      return null
    }
    const exclude = []
    const [ , existing ] = await _eachExtension((type, existing) => {
      existing && exclude.push(existing.name)
    }, structure)
    return new Sql(_getDropExtensionQueries(exclude, existing))
  }

  const _addColumn = (column) => (
    Sql.create(
      'add column',
      `alter table ${_fullName} add column ${_getColumnDescription(column)};`,
    )
  )

  const _addExtension = (type, table, extension) => {
    let { columns = [], references, onDelete, onUpdate, match, condition, name } = extension
    const alterTable = `alter table ${table}`
    const extensionType = parser.encodeExtensionType(type)

    const addExtension = Sql.create(`add ${type}`)
    columns = columns.join(',')
    switch (type) {
      case 'index':
        return Sql.create(`create ${type}`, `create ${extensionType} on ${table} (${columns});`)

      case 'unique':
      case 'primaryKey':
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
    }
  }

  const _alterColumn = (column, key) => {
    const value = column.diff[key]
    const alterTable = `alter table ${_fullName}`
    if (key === 'name') {
      const { oldName, name } = column.diff
      return Sql.create('rename column', `${alterTable} rename column ${oldName} to ${name};`)
    } else if (key === 'nullable') {
      if (value === true) {
        if (_shouldBePrimaryKey(column.name)) {
          throw new Error(logger.error(
            `Error setting '${column.name}.nullable = true'. ` +
            `'${column.name}' is the primaryKey`,
          ))
        } else {
          return Sql.create('drop not null', `${alterTable} alter column ${column.name} drop not null;`)
        }
      } else {
        const setValues = column.default ? Sql.create(
          'set values by defaults',
          `update ${_fullName} set ${column.name} = ${column.default} where ${column.name} is null;`,
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

      if (column.force === true) {
        return Sql.create(
          'drop and add column',
          `${alterTable} drop column ${column.name}, add column ${_getColumnDescription(column)};`)
      } else {
        throw new Error(logger.error(
          `To changing the type '${oldType}' => '${type}' you need to set 'force: true' for '${column.name}' column`,
        ))
      }
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

    return chunks.join(' ')
  }

  const _createTable = ({ table = _fullName, columns = _schema.columns, force, temp }) => {
    columns = columns
      .map(_getColumnDescription)
      .join(',\n  ')
    temp = temp ? ' temporary' : ''
    return new Sql([
      force ? Sql.create('drop table', `drop table if exists ${table} cascade;`) : null,
      Sql.create('create table', `create${temp} table ${table} (\n  ${columns}\n);`),
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
      throw new Error(logger.error(
        `To use seeds, you need to set at least one constraint (primaryKey || unique)`,
      ))
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
      const [ columnUses, sequence ] = _sequences[i]
      const { actual = true, min, max } = sequence._getProperties()
      if (actual) {
        const sequenceCurValue = await sequence._getCurrentValue()
        const { rows: [ { max: valueForRestart } ] } = await client.query(
          queries.getMaxValueForRestartSequence(_fullName, columnUses, min, max, sequenceCurValue),
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
    _getSqlAddingExtensions,
    _getSqlCleaningExtensions,
    _getSqlInsertSeeds,
    _getSequences,
    _getProperties,
    _getSqlSequenceActualize,
    _name: _fullName,
    addSeeds,
  })
}

Table._read = async (client, options) => {
  const [ _schemaName = 'public', _tableName ] = parser.separateSchema(options.name)
  const fullName = `${_schemaName}.${_tableName}`

  const info = new Info({
    client,
    name: fullName,
  })

  const metalize = new Metalize({
    dialect: 'postgres',
    client,
  })

  const structures = await metalize.read.tables([ fullName ])

  const structure = structures.get(fullName)

  if (!structure) {
    return undefined
  }

  const removeNames = R.map(
    R.omit([ 'name' ]),
  )

  structure.columns.forEach((column) => {
    column.default = parser.decodeValue(
      parser.defaultValueInformationSchema(column.default, column.type),
      column.type,
    )
  })

  const properties = {
    name: fullName,
    columns: structure.columns,
    indexes: removeNames(structure.indexes),
    foreignKeys: removeNames(structure.foreignKeys),
    unique: removeNames(structure.unique),
    checks: removeNames(structure.checks),
  }

  if (options.seeds) {
    if (R.is(Object, options.seeds)) {
      const { orderBy, range } = options.seeds
      properties.seeds = await info.getRows(orderBy, range)
    } else {
      properties.seeds = await info.getRows()
    }
  }

  return properties
}

module.exports = Table
