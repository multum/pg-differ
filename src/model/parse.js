const R = require('ramda')
const utils = require('../utils')
const { TYPES, COLUMNS, CONSTRAINTS } = require('../constants')

const regExpTypeOptions = /\[]|\[\w+]|\(\w+\)|'(\w+|\d+)'/g

exports.trimType = (type) =>
  type.replace(regExpTypeOptions, '').trim()

const normalizeType = (type) => {
  const values = type.match(regExpTypeOptions) || []
  type = exports.trimType(type)

  // decode type alias
  const aliasDescription = TYPES.ALIASES[type]
  if (utils.isExist(aliasDescription)) {
    type = TYPES.ALIASES[type]
  }
  return values ? `${type}${values.join('')}` : type
}

exports.encodeConstraintType = (key) => {
  switch (key) {
    case 'primaryKey':
      return CONSTRAINTS.TYPES.PRIMARY_KEY
    case 'unique':
      return CONSTRAINTS.TYPES.UNIQUE
    case 'foreignKey':
      return CONSTRAINTS.TYPES.FOREIGN_KEY
    case 'index':
      return CONSTRAINTS.TYPES.INDEX
    default:
      return null
  }
}

const decodeConstraintType = (key) => {
  switch (key) {
    case CONSTRAINTS.TYPES.PRIMARY_KEY:
      return 'primaryKey'
    case CONSTRAINTS.TYPES.UNIQUE:
      return 'unique'
    case CONSTRAINTS.TYPES.FOREIGN_KEY:
      return 'foreignKey'
    case CONSTRAINTS.TYPES.INDEX:
      return 'index'
    default:
      return null
  }
}

const _forceDefaults = {
  unique: false,
  primaryKey: false,
  foreignKey: false,
}

exports.schema = (scheme) => {
  const columns = scheme.columns
    .map((column) => {
      column = R.pick(COLUMNS.ALL_PROPERTIES)(column)

      if (column.primaryKey === true) {
        column.nullable = false
      }

      const type = normalizeType(column['type'])

      return { ...COLUMNS.DEFAULTS, ...column, type }
    })

  let indexes = scheme.indexes
    ? R.concat(scheme.indexes, columnConstraints(columns))
    : columnConstraints(columns)

  indexes = indexes.map((constraint) => (
    constraint.type === 'foreignKey'
      ? {
        ...CONSTRAINTS.FOREIGN_KEY_DEFAULTS,
        ...constraint,
      }
      : constraint
  ))

  const forceIndexes = scheme.forceIndexes ? {
    ..._forceDefaults,
    ...scheme.forceIndexes.reduce((acc, index) => {
      acc[index] = true
      return acc
    }, {}),
  } : _forceDefaults

  return { ...scheme, columns, indexes, forceIndexes }
}

exports.dbColumns = R.map((column) => ({
  name: column['column_name'],
  nullable: column['is_nullable'] === 'YES',
  default: column['column_default'],
  type: column['data_type'],
  collate: column['collation_name'],
}))

exports.tableConstraints = R.pipe(
  R.sortBy(R.prop('ordinal_position')),
  R.groupBy(R.prop('constraint_name')),
  R.mapObjIndexed((value, name) => ({
    name,
    type: decodeConstraintType(value[0]['constraint_type']),
    columns: R.map(R.prop('column_name'), value),
  })),
  R.values,
)

const constraintDefinition = (type, definition) => {
  switch (type) {
    /**
     * example foreignKey definition
     * FOREIGN KEY (id, code) REFERENCES table_name(id, code)
     */
    case 'foreignKey': {
      const DEFAULTS = CONSTRAINTS.FOREIGN_KEY_DEFAULTS

      const [ columns, referenceColumns ] = definition.match(/[^(]+(?=\))/g).map(R.split(', '))
      const table = definition.match(/(?<=\bREFERENCES).*(?=\()/i)[0].trim()

      let match = definition.match(/(?<=\bMATCH.*)(FULL|SIMPLE|PARTIAL)/)
      match = match ? match[0].trim() : DEFAULTS.match

      let onDelete = definition.match(/(?<=\bON DELETE.*)(CASCADE|RESTRICT|NO ACTION)/)
      onDelete = onDelete ? onDelete[0].trim() : DEFAULTS.onDelete

      let onUpdate = definition.match(/(?<=\bON UPDATE.*)(CASCADE|RESTRICT|NO ACTION)/)
      onUpdate = onUpdate ? onUpdate[0].trim() : DEFAULTS.onUpdate

      return {
        columns,
        references: { table, columns: referenceColumns },
        onDelete,
        onUpdate,
        match,
      }
    }

    /**
     * example foreignKey definition
     * CREATE UNIQUE INDEX index_name ON table_name USING btree (code)
     */
    case 'index': {
      const columns = definition.match(/(?<=\bUSING.*)[^(]+(?=\))/)[0].split(', ')
      return { columns }
    }
    default:
      return {}
  }
}

exports.constraintDefinitions = R.curry((type, definitions) => (
  definitions.map(({ name, definition }) => ({
    name,
    type,
    ...constraintDefinition(type, definition),
  }))
))

const columnConstraints = (
  R.reduce((acc, column) => (
    R.pipe(
      R.pick(COLUMNS.CONSTRAINTS),
      R.toPairs,
      R.map(([ type, value ]) => {
        if ([ 'unique', 'primaryKey', 'index' ].includes(type)) {
          return value === true ? ({ type, columns: [ column.name ] }) : null
        } else if (type === 'references') {
          const DEFAULTS = CONSTRAINTS.FOREIGN_KEY_DEFAULTS
          return utils.notEmpty(value) ? ({
            type: 'foreignKey',
            columns: [ column.name ],
            references: { table: value.table, columns: value.columns.slice(0, 1) },
            match: column.match || DEFAULTS.match,
            onUpdate: column.onUpdate || DEFAULTS.onUpdate,
            onDelete: column.onDelete || DEFAULTS.onDelete,
          }) : null
        }
      }),
      R.filter(Boolean),
      R.concat(acc),
    )(column)
  ), [])
)
