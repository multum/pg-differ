const R = require('ramda')
const chalk = require('chalk')
const Sql = require('../sql')
const utils = require('../utils')
const parse = require('./parse')
const validate = require('./validate')
const { COLUMNS, TYPES } = require('../constants')

const _getSchema = R.pipe(
  validate.schema,
  parse.schema,
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

/**
 * @typedef {object} Schema
 * @property {string} table
 * @property {array} indexes
 * @property {array} columns
 */

/**
 * @typedef {object} Model
 * @property {function} getSyncConstraintSQL
 * @property {function} getSyncSql
 * @property {function} getSchema
 * @property {function} belongsTo
 */

/**
 *
 * @param {object} options
 * @returns {Model}
 */
const Model = function (options) {
  let _dbColumns = null
  let _dbConstraints = null

  const _schema = _getSchema(options.schema)
  const _table = _schema.table
  const { logger: _logger, client: _client } = options
  const { schema: _schemaName, table: _tableName } = _parseTableName(_table)
  const _belongs = new Map()

  const _force = _schema.forceIndexes

  /**
   * @returns {Schema}`
   */
  const getSchema = () => _schema

  const _fetchColumns = async () => {
    _dbColumns = await _client.find(`
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
  `).then(parse.dbColumns)
    return _dbColumns
  }

  const _fetchTableConstraints = () => (
    _client.find(`
    select 
      column_name,
      ordinal_position,
      tc.constraint_type,
      tc.constraint_name
    from information_schema.table_constraints as tc
    inner join information_schema.key_column_usage as ku
      on tc.constraint_name = ku.constraint_name
    where ku.table_name = '${_tableName}'
      and tc.constraint_type not in ('FOREIGN KEY')
      `).then(parse.tableConstraints)
  )

  const _fetchForeignKeyConstraints = () => (
    _client.find(`
    select
      conname as name,
      pg_catalog.pg_get_constraintdef(c.oid, true) as definition
    from pg_catalog.pg_constraint as c
      where c.conrelid = '${_table}'::regclass and c.contype = 'f' order by 1
      `).then(parse.constraintDefinitions('foreignKey'))
  )

  const _fetchIndexes = () => (
    _client.find(`
    select
      indexname as name,
      indexdef as definition
    from pg_indexes as i
      where schemaname = '${_schemaName}'
        and tablename = '${_tableName}'
        and indexname not in (select conname from pg_catalog.pg_constraint)
      `).then(parse.constraintDefinitions('index'))
  )

  /**
   *  Database constraint structure
   */
  const _fetchConstraints = async () => {
    _dbConstraints = await Promise.all([
      _fetchTableConstraints(),
      _fetchForeignKeyConstraints(),
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
    try {
      const { exist } = await _client.findOne(`select to_regclass('${_table}') as exist;`)
      R.isNil(exist) && _throwError(`table '${_table}' does not exist`)
    } catch (error) {
      return _createTable()
    }
    await _fetchStructure()
    return _syncColumnsSQL(_schema.columns)
  }

  const _getColumnDiffs = R.pipe(
    R.map((column) => {
      const dbColumn = utils.findByName(_dbColumns, column.name)
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
        _force[type]
      )),
    )
  )

  const _getSyncColumnSQL = (columnsWithDiffs) => {
    if (utils.notEmpty(columnsWithDiffs)) {
      const sql = new Sql()
      columnsWithDiffs.forEach((column) => {
        const { diff } = column
        if (diff) {
          Object.keys(diff).forEach((key) => {
            const alterQuery = _alterColumn(column, key)
            alterQuery && sql.add(alterQuery)
          })
        } else {
          sql.add(_addColumn(column))
        }
      })
      return (sql.getSize() && sql) || null
    } else {
      return null
    }
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
    type = parse.trimType(type)
    return Object.entries(TYPES.GROUPS)
      .find(([ name, group ]) => R.includes(type, group)) || []
  }

  const _alterConstraint = ({ type, columns, references, onDelete, onUpdate, match }) => {
    const alterTable = `alter table ${_table}`
    const constraintType = parse.encodeConstraintType(type)

    const addConstraint = Sql.create(`add ${type}`)

    switch (type) {
      case 'index':
        return Sql.create(`create ${type}`, `create ${constraintType} on ${_table} (${columns.join(',')});`)

      case 'primaryKey':
        return addConstraint(`${alterTable} add ${constraintType} (${columns.join(',')});`)

      case 'unique':
        return [
          _force.unique ? Sql.create(`delete rows`, `delete from ${_table};`) : null,
          addConstraint(`${alterTable} add ${constraintType} (${columns.join(',')});`),
        ]

      case 'foreignKey':
        match = match ? ` match ${match}` : ''
        return addConstraint(`
        ${alterTable}
        add ${constraintType} (${columns.join(',')})
        references ${references.table} (${references.columns.join(',')})${match}
        on update ${onUpdate} on delete ${onDelete};
        `)

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
    if (key === 'nullable') {
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
      const [ oldTypeGroup ] = _getTypeGroup(oldType)
      const [ newTypeGroup ] = _getTypeGroup(type)
      const collate = column.collate ? ` collate ${column.collate}` : ''
      if (
        !oldType ||
        (oldTypeGroup === 'integer' && newTypeGroup === 'integer') ||
        (oldTypeGroup === 'character' && newTypeGroup === 'character') ||
        (oldTypeGroup === 'integer' && newTypeGroup === 'character')
      ) {
        return Sql.create('set type', `${alterTable} alter column ${column.name} type ${column.type}${collate};`)
      } else if (oldTypeGroup === 'character' && newTypeGroup === 'integer') {
        return Sql.create('set type', `${alterTable} alter column ${column.name} type ${column.type}${collate} using (trim(${column.name})::integer);`)
      } else {
        return column.force === true
          ? Sql.create(
            'drop and add column',
            `${alterTable} drop column ${column.name}, add column ${_getColumnDescription(column)};`)
          : _logger(
            chalk.red('Warning'),
            chalk.red(`To change the ${chalk.green(oldType)} type to ${chalk.green(type)} you need to set 'force: true'`),
          )
      }
    } else if (key === 'default') {
      return Sql.create('set default', `${alterTable} alter column ${column.name} set default ${value};`)
    }
    return null
  }

  const _inPrimaryKey = (column) => {
    const primaryKey = _schema.indexes.find(R.propEq('type', 'primaryKey'))
    return column.primaryKey === true || (primaryKey && R.includes(column.name, primaryKey.columns))
  }

  const _isPrimaryKey = (columns) => {
    const primaryKey = _schema.indexes.find(R.propEq('type', 'primaryKey'))
    return primaryKey && R.equals(columns, primaryKey.columns)
  }

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

  const _createTable = () => {
    const sql = new Sql()
    const columns = _schema.columns
      .map(_getColumnDescription)
      .join(',\n')
    return sql.add(Sql.create('create table', `create table ${_table} (\n${columns}\n);`))
  }

  const _getColumnAttributeDiffs = (column, dbColumn) => (
    Object.keys(R.pick(COLUMNS.ATTRS, column)).reduce((acc, key) => {
      if (dbColumn[key] !== column[key]) {
        acc[key] = column[key]
        if (key === 'type') {
          acc['oldType'] = dbColumn[key]
        }
      }
      return acc
    }, {})
  )

  const getSyncConstraintSQL = async () => {
    await _fetchConstraints()
    return _getSyncConstraintSQL([ ..._schema.indexes, ..._getBelongConstraints() ])
  }

  return Object.freeze({ getSyncSql, getSyncConstraintSQL, getSchema, belongsTo })
}

module.exports = Model
