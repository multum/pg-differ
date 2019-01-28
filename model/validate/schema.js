const Ajv = require('ajv')

const ajv = new Ajv()
const validate = ajv.compile(require('./schema.json'))

const schema = (schema) => {
  const valid = validate(schema)

  if (valid) {
    return schema
  }

  throw validate.errors
}

module.exports = schema
