/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const R = require('ramda')
const chalk = require('chalk')
const Sql = require('../sql')
const Seeds = require('./seeds')

const utils = require('../utils')
const parser = require('./parser')
const validate = require('./validate')
const { COLUMNS, TYPES } = require('../constants')

const _getSchema = R.pipe(
  validate.schema,
  parser.schema,
)

const _parseTableName = (name) => {
  const chunks = name.split('.')
  return {
    schema: chunks[1] ? chunks[0] : 'public',
    table: chunks[1] || chunks[0],
  }
}

const _throwError = (message) => {
  throw new Error(message)
}

module.exports = function (options) {
  let _dbColumns = null
  let _dbConstraints = null

  const _schema = _getSchema(options.schema)
  const _table = _schema.table
  const { log, client } = options
  const { schema: _schemaName, table: _tableName } = _parseTableName(_table)

  const _forceIndexes = _schema.forceIndexes
  const _primaryKey = _schema.indexes.find(R.propEq('type', 'primaryKey'))
  const _forceCreate = R.isNil(_schema.force) ? options.force : _schema.force

  const _belongs = new Map()
  const _seeds = new Seeds({
    table: _table,
  })

  const getSchema = () => _schema

  const _fetchColumns = async () => {
    _dbColumns = await client.find(`
    select
      pg_catalog.format_type(c.atttypid, c.atttypmod) as data_type,
      ic.collation_name,
      ic.column_default,
      ic.is_nullable,
      ic.column_name
    from pg_attribute c
    join pg_class t on c.attrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    join information_schema.columns ic
      on c.attname = ic.column_name
      and t.relname = ic.table_name
      and n.nspname = ic.table_schema
    where t.relname = '${_tableName}'
      and n.nspname = '${_schemaName}';
  `).then(parser.dbColumns)
    return _dbColumns
  }

  const _fetchConstraints = () => (
    client.find(`
    select
      conname as name,
      c.contype as type,
      pg_catalog.pg_get_constraintdef(c.oid, true) as definition
    from pg_catalog.pg_constraint as c
      where c.conrelid = '${_table}'::regclass order by 1
      `).then(parser.constraintDefinitions)
  )

  const _fetchIndexes = () => (
    client.find(`
    select
      indexname as name,
      indexdef as definition
    from pg_indexes as i
      where schemaname = '${_schemaName}'
        and tablename = '${_tableName}'
        and indexname not in (select conname from pg_catalog.pg_constraint)
      `).then(parser.indexDefinitions)
  )

  /**
   *  Database constraint structure
   */
  const _fetchAllConstraints = async () => {
    _dbConstraints = await Promise.all([
      _fetchConstraints(),
      _fetchIndexes(),
    ]).then(R.reduce(R.concat, []))
    return _dbConstraints
  }

  /**
   *  Database column and constraint structure
   */
  const _fetchStructure = () => (
    Promise.all([
      _fetchColumns(),
      _fetchConstraints(),
    ])
  )

  const belongsTo = (model) => {
    const { table } = model.getSchema()
    _belongs.has(table) || _belongs.set(table, model)
  }

  const _getBelongConstraints = () => (
    [ ..._belongs.values() ]
      .reduce((acc, model) => {
        const { indexes } = model.getSchema()
        indexes.forEach((constraint) => {
          const { type, references } = constraint
          if (type === 'foreignKey' && !_isPrimaryKey(references.columns)) {
            acc.push({ type: 'unique', columns: references.columns })
          }
        })
        return acc
      }, [])
  )

  const getSyncSql = async () => {
    if (_forceCreate) {
      return _createTable(true)
    }
    try {
      const { exist } = await client.findOne(`select to_regclass('${_table}') as exist;`)
      R.isNil(exist) && _throwError(`table '${_table}' does not exist`)
    } catch (error) {
      return _createTable()
    }
    await _fetchStructure()
    return _syncColumnsSQL(_schema.columns)
  }

  const _getColumnDiffs = R.pipe(
    R.map((column) => {
      const dbColumn = utils.findByName(_dbColumns, column.name, column.formerNames)
      if (dbColumn) {
        const diff = _getColumnAttributeDiffs(column, dbColumn)
        return diff && utils.notEmpty(diff)
          ? { ...column, diff }
          : null
      } else {
        return column
      }
    }),
    R.filter(Boolean),
  )

  const _findDbConstraintWhere = (props) => {
    const { type, columns } = props
    if (columns) {
      return utils.notEmpty(columns)
        ? _dbConstraints.find(R.whereEq(props))
        : null
    } else {
      return _dbConstraints.find(R.propEq('type', type))
    }
  }

  const _dropConstraints = (exclude = []) => (
    _getDropConstraintQueries(
      // must be drop
      _dbConstraints.filter(({ name, type }) => (
        !exclude.includes(name) &&
        _forceIndexes[type]
      )),
    )
  )

  const _getSyncColumnSQL = (columnsWithDiffs) => {
    const sql = new Sql()
    if (utils.notEmpty(columnsWithDiffs)) {
      columnsWithDiffs.forEach((column) => {
        const { diff } = column
        if (diff) {
          let keys = Object.keys(diff)
          if (diff.name) {
            keys = [ 'name', ...R.without('name', keys) ]
          }
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

  const _getSyncConstraintSQL = (constraints) => {
    const sql = new Sql()
    const excludeDrop = []

    if (utils.notEmpty(constraints)) {
      constraints.forEach((constraint) => {
        const dbConstraint = _findDbConstraintWhere(constraint)
        if (dbConstraint) {
          excludeDrop.push(dbConstraint.name)
        } else {
          sql.add(_alterConstraint(constraint))
        }
      })
    }

    return sql.add(_dropConstraints(excludeDrop))
  }

  const _syncColumnsSQL = R.pipe(
    _getColumnDiffs,
    _getSyncColumnSQL,
  )

  const _addColumn = (column) => (
    Sql.create(
      'add column',
      `alter table ${_table} add column ${_getColumnDescription(column)};`,
    )
  )

  const _getTypeGroup = (type) => {
    type = parser.trimType(type)
    return Object.values(TYPES.GROUPS)
      .find((group) => R.includes(type, group)) || null
  }

  const _alterConstraint = ({ type, columns, references, onDelete, onUpdate, match }) => {
    const alterTable = `alter table ${_table}`
    const constraintType = parser.encodeConstraintType(type)

    const addConstraint = Sql.create(`add ${type}`)
    columns = columns.join(',')
    switch (type) {
      case 'index':
        return Sql.create(`create ${type}`, `create ${constraintType} on ${_table} (${columns});`)

      case 'primaryKey':
        return addConstraint(`${alterTable} add ${constraintType} (${columns});`)

      case 'unique':
        return [
          _forceIndexes.unique ? Sql.create(`delete rows`, `delete from ${_table};`) : null,
          addConstraint(`${alterTable} add ${constraintType} (${columns});`),
        ]

      case 'foreignKey': {
        match = match ? ` match ${match}` : null
        references = `references ${references.table} (${references.columns.join(',')})`
        const events = `on update ${onUpdate} on delete ${onDelete}`
        return addConstraint(`${alterTable} add ${constraintType} (${columns}) ${references}${match} ${events};`)
      }

      default:
        return null
    }
  }

  const _getDropConstraintQueries = (constraints) => (
    constraints.map(_dropConstraint).filter(Boolean)
  )

  const _dropConstraint = (constraint) => {
    const alterTable = `alter table ${_table}`
    if (constraint.type === 'index') {
      const indexName = _schemaName ? `${_schemaName}.${constraint.name}` : constraint.name
      return Sql.create(`drop ${constraint.type}`, `drop index ${indexName};`)
    }
    return Sql.create(`drop ${constraint.type}`, `${alterTable} drop constraint ${constraint.name};`)
  }

  const _alterColumn = (column, key) => {
    const value = column.diff[key]
    const alterTable = `alter table ${_table}`
    if (key === 'name') {
      const { oldName, name } = column.diff
      return Sql.create('rename column', `${alterTable} rename column ${oldName} to ${name};`)
    } else if (key === 'nullable') {
      if (value === true && !_inPrimaryKey(column)) {
        const primaryKey = _findDbConstraintWhere({ type: 'primaryKey' })
        return [
          primaryKey ? _dropConstraint(primaryKey) : null,
          Sql.create('drop not null', `${alterTable} alter column ${column.name} drop not null;`),
        ]
      } else if (value === false) {
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
      const oldTypeGroup = _getTypeGroup(oldType)
      const newTypeGroup = _getTypeGroup(type)
      const { INTEGER, CHARACTER, BOOLEAN } = TYPES.GROUPS
      const collate = column.collate ? ` collate ${column.collate}` : ''

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
        : log(
          null,
          chalk.red(`To changing the type ${chalk.green(oldType)} => ${chalk.green(type)} you need to set 'force: true' for '${column.name}' column`),
        )
    } else if (key === 'default') {
      return Sql.create('set default', `${alterTable} alter column ${column.name} set default ${value};`)
    }
    return null
  }

  const _inPrimaryKey = (column) => (
    column.primaryKey === true || (_primaryKey && R.includes(column.name, _primaryKey.columns))
  )

  const _isPrimaryKey = (columns) => (
    _primaryKey && R.equals(columns, _primaryKey.columns)
  )

  const _getColumnDescription = (column) => {
    const chunks = [ `${column.name} ${column.type}` ]

    if (column.collate) {
      chunks.push(`collate "${column.collate}"`)
    }

    if (column.default != null) {
      chunks.push(`default ${column.default}`)
    }

    if (column.nullable && !_inPrimaryKey(column)) {
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

  const _createTable = (force) => {
    const sql = new Sql()
    const columns = _schema.columns
      .map(_getColumnDescription)
      .join(',\n\t')
    return sql.add([
      force ? Sql.create('drop table', `drop table if exists ${_table} cascade;`) : null,
      Sql.create('create table', `create table ${_table} (\n\t${columns}\n);`),
    ])
  }

  const _getColumnAttributeDiffs = (column, dbColumn) => (
    Object.keys(R.pick(COLUMNS.ATTRS, column)).reduce((acc, key) => {
      if (dbColumn[key] !== column[key]) {
        acc[key] = column[key]
        switch (key) {
          case 'type': {
            acc['oldType'] = dbColumn[key]
            break
          }
          case 'name': {
            acc['oldName'] = dbColumn[key]
            break
          }
        }
      }
      return acc
    }, {})
  )

  const addSeeds = (seeds) => _seeds.add(seeds)

  const getSyncConstraintSQL = async () => {
    await _fetchAllConstraints()
    return _getSyncConstraintSQL([ ..._schema.indexes, ..._getBelongConstraints() ])
  }

  const getSeedSql = () => {
    const hasConstraints = _schema.indexes.some(({ type }) => (
      [ 'unique', 'primaryKey' ].includes(type)
    ))
    if (hasConstraints) {
      const inserts = _seeds.inserts()
      return new Sql().add(inserts.map((insert) => Sql.create('insert seed', insert)))
    } else {
      log(null, chalk.red(`To use seeds, you need to set at least one constraint (primaryKey || unique)`))
    }
  }

  return Object.freeze({ getSyncSql, getSyncConstraintSQL, getSchema, belongsTo, addSeeds, getSeedSql })
}
