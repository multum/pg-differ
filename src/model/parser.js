/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const R = require('ramda')
const utils = require('../utils')
const { TYPES, COLUMNS, CONSTRAINTS } = require('../constants')

const regExpTypeOptions = /\[]|\[\w+]|\(\w+\)|'(\w+|\d+)'/g

exports.trimType = (type) =>
  type.replace(regExpTypeOptions, '').trim()

exports.normalizeType = (type) => {
  const values = type.match(regExpTypeOptions) || []
  type = exports.trimType(type)

  // decode type alias
  const aliasDescription = TYPES.ALIASES[type]
  if (utils.isExist(aliasDescription)) {
    type = TYPES.ALIASES[type]
  }
  return values ? `${type}${values.join('')}` : type
}

exports.normalizeValue = (target) => (
  utils.isObject(target) ? `'${JSON.stringify(target)}'::json` : target
)

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

const _forceDefaults = {
  primaryKey: false,
  foreignKey: false,
  unique: false,
}

exports.schema = (scheme) => {
  const columns = scheme.columns
    .map((column) => {
      column = {
        ...COLUMNS.DEFAULTS,
        ...R.pick(COLUMNS.ALL_PROPERTIES, column),
      }

      if (column.primaryKey === true) {
        column.nullable = false
      }

      const type = exports.normalizeType(column['type'])
      const defaultValue = exports.normalizeValue(column.default)

      return {
        ...column,
        type,
        default: defaultValue,
      }
    })

  const columnConstraints = _getConstraintsFromColumns(columns)
  let indexes = scheme.indexes
    ? R.concat(scheme.indexes, columnConstraints)
    : columnConstraints

  indexes = indexes.map((constraint) => (
    constraint.type === 'foreignKey'
      ? {
        ...CONSTRAINTS.FOREIGN_KEY_DEFAULTS,
        ...constraint,
      }
      : constraint
  ))

  const forceIndexes = {
    ..._forceDefaults,
    ...scheme.forceIndexes
      ? scheme.forceIndexes.reduce((acc, index) => {
        acc[index] = true
        return acc
      }, {})
      : { primaryKey: true },
  }

  return { ...scheme, columns, indexes, forceIndexes }
}

exports.dbColumns = R.map((column) => ({
  name: column['column_name'],
  nullable: column['is_nullable'] === 'YES',
  default: column['column_default'],
  type: column['data_type'],
  collate: column['collation_name'],
}))

const constraintDefinitionOptions = (type, definition) => {
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
     * example unique and primaryKey definitions
     * UNIQUE (code)
     * PRIMARY KEY (code)
     */
    case 'unique':
    case 'primaryKey': {
      const columns = definition.match(/[^(]+(?=\))/)[0].split(', ')
      return { columns }
    }

    /**
     * example index definition
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

exports.constraintDefinitions = R.map(({ name, definition, type }) => {
  switch (type) {
    case 'p':
      type = 'primaryKey'
      break
    case 'f':
      type = 'foreignKey'
      break
    case 'u':
      type = 'unique'
      break
    default:
      break
  }
  return { name, type, ...constraintDefinitionOptions(type, definition) }
})

exports.indexDefinitions = R.map(({ name, definition }) => ({
  name,
  type: 'index',
  ...constraintDefinitionOptions('index', definition),
}))

const _getConstraintsFromColumns = (
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
