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
const Sequence = require('../sequence')
const Logger = require('../logger')

const utils = require('../utils')
const parser = require('./parser')
const { COLUMNS, TYPES } = require('../constants')

const validate = require('../validate')
const { SCHEMAS } = validate

const _parseSchema = R.pipe(
  R.prop('properties'),
  validate(SCHEMAS.MODEL),
  parser.schema,
)

const _setupSequences = ({ columns, tableName, schemaName, client }) => {
  const sequenceColumns = columns.filter(R.prop('autoIncrement'))
  if (sequenceColumns.length) {
    return sequenceColumns.map((column) => {
      const properties = column.autoIncrement
      const sequence = new Sequence({
        client,
        schema: schemaName,
        properties: {
          name: `${tableName}_${column.name}_seq`,
          ...properties,
        },
      })
      column.default = sequence.getSqlIncrement()
      return sequence
    })
  }
}

const _parseTableName = (name) => {
  const chunks = name.split('.')
  return {
    schema: chunks[1] ? chunks[0] : 'public',
    table: chunks[1] || chunks[0],
  }
}

module.exports = function (options) {
  const { client, force, schema, logging } = options

  let _dbColumns = null
  let _dbConstraints = null

  const _schema = _parseSchema(schema)
  const _table = _schema.name
  const { schema: _schemaName, table: _tableName } = _parseTableName(_table)

  const _forceIndexes = _schema.forceIndexes
  const _primaryKey = _schema.indexes.find(R.propEq('type', 'primaryKey'))
  const _forceCreate = R.isNil(_schema.force) ? force : _schema.force

  const _seeds = new Seeds({
    table: _table,
  })

  const logger = new Logger({ prefix: `Postgres Differ('${_table}')`, callback: logging })

  if (_schema.seeds) {
    _seeds.add(_schema.seeds)
  }

  const _sequences = _setupSequences({
    client,
    tableName: _tableName,
    schemaName: _schemaName,
    columns: _schema.columns,
  })

  const _getSchema = () => _schema

  const _fetchColumns = async () => {
    _dbColumns = await client.query(`
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
  `).then(R.prop('rows')).then(parser.dbColumns(_schemaName))
    return _dbColumns
  }

  const _fetchConstraints = () => (
    client.query(`
    select
      conname as name,
      c.contype as type,
      pg_catalog.pg_get_constraintdef(c.oid, true) as definition
    from pg_catalog.pg_constraint as c
      where c.conrelid = '${_table}'::regclass order by 1
      `).then(R.prop('rows')).then(parser.constraintDefinitions)
  )

  const _fetchIndexes = () => (
    client.query(`
    select
      indexname as name,
      indexdef as definition
    from pg_indexes as i
      where schemaname = '${_schemaName}'
        and tablename = '${_tableName}'
        and indexname not in (select conname from pg_catalog.pg_constraint)
      `).then(R.prop('rows')).then(parser.indexDefinitions)
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
    Promise.all([ _fetchColumns(), _fetchAllConstraints() ])
  )

  const _getSqlCreateOrAlterTable = async () => {
    if (_forceCreate) {
      return _createTable(true)
    }
    const {
      rows: [
        { exists },
      ],
    } = await client.query(`
      select exists (
        select 1 from pg_tables
          where schemaname = '${_schemaName}'
          and tablename = '${_tableName}'
      )`)
    if (exists) {
      await _fetchStructure()
      return _getSQLColumnChanges()
    } else {
      return _createTable()
    }
  }

  const _getColumnDifferences = R.pipe(
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

  const _getDropConstraintQueries = (exclude = []) => (
    // must be drop
    _dbConstraints
      .filter(({ name, type }) => !exclude.includes(name) && _forceIndexes[type])
      .map(_dropConstraint)
  )

  const _getSQLColumnChanges = () => {
    const sql = new Sql()
    const differences = _getColumnDifferences(_schema.columns)
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

  const _getSqlConstraintChanges = async () => {
    await _fetchAllConstraints()
    const constraints = _schema.indexes
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

    return sql.add(_getDropConstraintQueries(excludeDrop))
  }

  const _addColumn = (column) => (
    Sql.create(
      'add column',
      `alter table ${_table} add column ${_getColumnDescription(column)};`,
    )
  )

  const _alterConstraint = (constraint) => {
    let { type, columns, references, onDelete, onUpdate, match } = constraint
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
        return !_shouldBePrimaryKey(constraint.columns) && [
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
      if (value === true) {
        if (_shouldBePrimaryKey(column.name)) {
          logger.error(
            `Error setting '${column.name}.nullable = true'\n` +
            `${column.name} is primaryKey`,
          )
        } else {
          let dropPrimaryKey = null
          const primaryKey = _findDbConstraintWhere({ type: 'primaryKey' })
          if (primaryKey && R.includes(column.name, primaryKey.columns)) {
            if (_forceIndexes.primaryKey) {
              dropPrimaryKey = _dropConstraint(primaryKey)
            } else {
              logger.error(
                `Error setting '${column.name}.nullable = true'\n` +
                `You need to add 'primaryKey' to 'forceIndexes'`,
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
          `To changing the type ${chalk.green(oldType)} => ${chalk.green(type)} ` +
          `you need to set 'force: true' for '${column.name}' column`,
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
      return R.is(Array)
        ? R.equals(names, _primaryKey.columns)
        : R.includes(names, _primaryKey.columns)
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

  const _createTable = (force) => {
    const columns = _schema.columns
      .map(_getColumnDescription)
      .join(',\n\t')
    return new Sql([
      force ? Sql.create('drop table', `drop table if exists ${_table} cascade;`) : null,
      Sql.create('create table', `create table ${_table} (\n\t${columns}\n);`),
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

  const addSeeds = _seeds.add

  const _getSqlInsertSeeds = () => {
    const hasConstraints = _schema.indexes.some(({ type }) => (
      [ 'unique', 'primaryKey' ].includes(type)
    ))
    if (hasConstraints) {
      const inserts = _seeds.inserts()
      return new Sql(inserts.map((insert) => Sql.create('insert seed', insert)))
    } else {
      logger.error(`To use seeds, you need to set at least one constraint (primaryKey || unique)`)
      return null
    }
  }

  const _getSqlSequenceChangesFrom = R.when(
    R.identity,
    R.pipe(
      R.map((seq) => seq.getChanges()),
      (promises) => Promise.all(promises),
      R.then(
        R.pipe(
          R.filter(Boolean),
          R.map((seq) => seq.getStore()),
          R.unnest,
          (sqlArray) => new Sql(sqlArray),
        ),
      ),
    ),
  )

  const _getSqlSequenceChanges = () => _getSqlSequenceChangesFrom(_sequences)

  return Object.freeze({
    _getSqlCreateOrAlterTable,
    _getSqlConstraintChanges,
    _getSqlInsertSeeds,
    _getSqlSequenceChanges,
    _getSchema,
    addSeeds,
  })
}
