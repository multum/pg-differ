/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const R = require('ramda')
const utils = require('../utils')
const { TYPES, COLUMNS, CONSTRAINTS, SEQUENCES } = require('../constants')

exports.getTypeGroup = (type) => {
  if (type) {
    type = exports.trimType(type)
    return Object.values(TYPES.GROUPS)
      .find((group) => R.includes(type, group)) || null
  }
}

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

exports.defaultValueInformationSchema = (target, currentSchema) => {
  switch (typeof target) {
    case 'string': {
      // adding the current scheme in case of its absence
      target = target.replace(/(?<=nextval\(')(?=[^.]*$)/, `${currentSchema}.`)
      //
      const regExp = /::((?![')]).)*$/
      if (target.match(regExp)) {
        return target.replace(regExp, '')
      } else {
        return target
      }
    }
    default: {
      return target
    }
  }
}
exports.normalizeAutoIncrement = (target) => {
  if (R.is(Object, target)) {
    return {
      ...SEQUENCES.DEFAULTS,
      ...target,
    }
  } else if (target) {
    return { ...SEQUENCES.DEFAULTS }
  }
  return target
}

exports.normalizeValue = (target) => {
  switch (typeof target) {
    case 'number' :
      return target
    case 'string': {
      const regExp = /::sql$/
      if (target.match(regExp)) {
        return target.replace(regExp, '')
      } else {
        return `'${target}'`
      }
    }
    default: {
      return utils.isObject(target) ? `'${JSON.stringify(target)}'` : target
    }
  }
}

const _encodeConstraintTypes = {
  'primaryKey': CONSTRAINTS.TYPES.PRIMARY_KEY,
  'unique': CONSTRAINTS.TYPES.UNIQUE,
  'foreignKey': CONSTRAINTS.TYPES.FOREIGN_KEY,
  'index': CONSTRAINTS.TYPES.INDEX,
}

exports.encodeConstraintType = (key) => _encodeConstraintTypes[key] || null

const _forceDefaults = {
  primaryKey: false,
  foreignKey: false,
  unique: false,
}

exports.schema = (properties) => {
  const columns = properties.columns
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
      const autoIncrement = exports.normalizeAutoIncrement(column.autoIncrement)

      return {
        ...column,
        type,
        autoIncrement,
        default: defaultValue,
      }
    })

  const columnConstraints = _getConstraintsFromColumns(columns)
  let indexes = properties.indexes
    ? R.concat(properties.indexes, columnConstraints)
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
    ...properties.forceIndexes
      ? properties.forceIndexes.reduce((acc, index) => {
        acc[index] = true
        return acc
      }, {})
      : { primaryKey: true },
  }

  return { ...properties, columns, indexes, forceIndexes }
}

exports.dbColumns = R.curry((currentSchema, columns) => (
  columns.map((column) => {
    const {
      column_name: name,
      is_nullable: nullable,
      data_type: type,
      column_default: defaultValue,
      collation_name: collate,
    } = column
    return {
      name,
      nullable: nullable === 'YES',
      default: exports.defaultValueInformationSchema(defaultValue, currentSchema),
      type: type,
      collate: collate,
    }
  })
))

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
