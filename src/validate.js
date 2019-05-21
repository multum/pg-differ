/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const R = require('ramda')
const Ajv = require('ajv')

const TYPES = {
  MODEL: 'model',
  SEQUENCE: 'sequence',
}

const ajv = new Ajv({
  schemas: (
    Object.values(TYPES).map((schemaPath) => {
      const json = require(`./schemas/${schemaPath}`)
      json.$id = schemaPath
      return json
    })
  ),
})

const formatErrors = R.pipe(
  R.map(({ dataPath, message }) => `[ ${dataPath} ] - ${message}`),
  R.prepend('Schema validation error'),
  R.join('\n'),
)

const validate = R.curry((schemaName, target) => {
  const validate = ajv.getSchema(schemaName)
  if (validate(target)) {
    return target
  } else {
    throw new Error(formatErrors(validate.errors))
  }
})

module.exports = {
  model: validate(TYPES.MODEL),
  sequence: validate(TYPES.SEQUENCE),
}
