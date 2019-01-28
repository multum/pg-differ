const R = require('ramda')
const Ajv = require('ajv')

const ajv = new Ajv()
const validate = ajv.compile(require('./schema.json'))

const formatErrors = R.pipe(
  R.map(({ dataPath, message }) => `${dataPath} --- ${message}`),
  R.join('\n'),
)

const schema = (schema) => {
  const valid = validate(schema)

  if (valid) {
    return schema
  }

  throw new Error(formatErrors(validate.errors))
}

module.exports = schema
