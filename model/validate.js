const R = require('ramda')
const utils = require('../utils')

const schema = (schema) => {
  let hasPrimaryKey = false
  const schemaHasPrimaryKey = schema.primaryKey && utils.notEmpty(schema.primaryKey)
  const errors = new Set()
  const primaryKey = schema.indexes && schema.indexes.find(R.propEq('name', 'primaryKey'))

  if (primaryKey) {
    hasPrimaryKey = true
    if (!R.is(Array, primaryKey.columns)) {
      errors.add(`'primaryKey' must be an Array`)
    }
  }

  schema.columns.forEach((column) => {
    // if (column.nullable === false && !column.default) {
    //   errors.add(`If you want to set the "nullable: true" for column "${column.name}", please set the default value`)
    // }
    if (
      (schemaHasPrimaryKey && column.primaryKey) ||
      (hasPrimaryKey && column.primaryKey)
    ) {
      errors.add(`Installing a 'primaryKey' is possible only once. Remove all but one`)
    }
    if (column.primaryKey) {
      hasPrimaryKey = true
    }
  })

  if (errors.size) {
    throw new Error([ ...errors ].join('\n'))
  }
  return schema
}

module.exports = {
  schema,
}
