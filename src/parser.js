/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const R = require('ramda')
const utils = require('./utils')
const { TYPES, COLUMNS, EXTENSIONS, SEQUENCES } = require('./constants')

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
        return exports.quoteLiteral(target)
      }
    }
    default: {
      return R.is(Object, target) ? `'${JSON.stringify(target)}'` : target
    }
  }
}

const _encodeExtensionTypes = {
  'primaryKey': EXTENSIONS.TYPES.PRIMARY_KEY,
  'unique': EXTENSIONS.TYPES.UNIQUE,
  'foreignKey': EXTENSIONS.TYPES.FOREIGN_KEY,
  'index': EXTENSIONS.TYPES.INDEX,
  'check': EXTENSIONS.TYPES.CHECK,
}

exports.encodeExtensionType = (key) => _encodeExtensionTypes[key] || null

const _cleanableDefaults = {
  primaryKey: true,
  foreignKey: false,
  unique: false,
  check: false,
}

const _getExtensionDefaults = (type) => {
  switch (type) {
    case 'primaryKeys':
      return { type: 'primaryKey' }
    case 'indexes':
      return { type: 'index' }
    case 'foreignKeys':
      return {
        type: 'foreignKey',
        ...EXTENSIONS.FOREIGN_KEY_DEFAULTS,
      }
    default:
      return { type }
  }
}

exports.schema = (schema) => {
  const columns = schema.columns
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

  const extensions = R.pipe(
    R.ifElse(
      R.not,
      R.always([]),
      R.pipe(
        R.pick([ 'indexes', 'unique', 'foreignKeys', 'primaryKeys' ]), // without 'checks'
        R.filter(Boolean),
        R.toPairs,
        R.reduce((acc, [ type, elements ]) => (
          R.concat(acc, elements.map((props) => ({ ..._getExtensionDefaults(type), ...props })))
        ), []),
      ),
    ),
    R.concat(_getExtensionsFromColumns(columns)),
  )(schema.extensions)

  const cleanableExtensions = {
    ..._cleanableDefaults,
    ...R.pathOr({}, [ 'extensions', 'cleanable' ], schema),
  }

  const checks = R.path([ 'extensions', 'checks' ], schema)

  return {
    name: schema.name,
    force: schema.force,
    seeds: schema.seeds,
    checks,
    columns,
    extensions,
    cleanableExtensions,
  }
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

const extensionDefinitionOptions = (type, definition) => {
  switch (type) {
    /**
     * example foreignKey definition
     * FOREIGN KEY (id, code) REFERENCES table_name(id, code)
     */
    case 'foreignKey': {
      const DEFAULTS = EXTENSIONS.FOREIGN_KEY_DEFAULTS

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

    /**
     * example foreignKey definition
     * FOREIGN KEY (id, code) REFERENCES table_name(id, code)
     */
    case 'check': {
      return { definition: definition.match(/[^(]+(?=\))/)[0] }
    }

    default:
      return {}
  }
}

exports.extensionDefinitions = R.map(({ name, definition, type }) => {
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
    case 'c':
      type = 'check'
      break
    default:
      break
  }
  return { name, type, ...extensionDefinitionOptions(type, definition) }
})

exports.indexDefinitions = R.map(({ name, definition }) => ({
  name,
  type: 'index',
  ...extensionDefinitionOptions('index', definition),
}))

const _getExtensionsFromColumns = (
  R.reduce((acc, column) => (
    R.pipe(
      R.pick(COLUMNS.EXTENSIONS),
      R.toPairs,
      R.map(([ type, value ]) => value === true ? ({ type, columns: [ column.name ] }) : null),
      R.filter(Boolean),
      R.concat(acc),
    )(column)
  ), [])
)

exports.quoteLiteral = (value) => {
  const literal = value.slice(0) // create copy

  let hasBackslash = false
  let quoted = '\''

  for (let i = 0; i < literal.length; i++) {
    const c = literal[i]
    if (c === '\'') {
      quoted += c + c
    } else if (c === '\\') {
      quoted += c + c
      hasBackslash = true
    } else {
      quoted += c
    }
  }

  quoted += '\''

  if (hasBackslash === true) {
    quoted = 'E' + quoted
  }

  return quoted
}

exports.separateSchema = (name) => {
  const chunks = name.split('.')
  return [
    chunks[1] ? chunks[0] : 'public',
    chunks[1] || chunks[0],
  ]
}

exports.dbSequence = (response) => {
  if (response) {
    const {
      start_value: start,
      minimum_value: min,
      maximum_value: max,
      cycle_option: cycle,
      increment,
    } = response
    return { start, min, max, increment, cycle: cycle === 'YES' }
  }
}
