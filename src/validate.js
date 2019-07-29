/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const R = require('ramda')
const Ajv = require('ajv')

const TYPES = {
  TABLE_DEFINITION: 'define.table',
  SEQUENCE_DEFINITION: 'define.sequence',
  TABLE_READING: 'read.table',
  SEQUENCE_READING: 'read.sequence',
}

const ajv = new Ajv({
  schemas: (
    Object.values(TYPES).map((schemaPath) => {
      const json = require(`./schemas/${schemaPath}.json`)
      json.$id = schemaPath
      return json
    })
  ),
})

const formatErrors = (validateType, errors) => `${validateType}\n\t${
  errors.map(({ dataPath, message }) => `${dataPath ? `[ ${dataPath} ] ` : ''}${message}`).join('\n\t')}
`

const validate = R.curry((validateType, object) => {
  const validate = ajv.getSchema(validateType)
  if (validate(object)) {
    return object
  } else {
    throw new Error(formatErrors(validateType, validate.errors))
  }
})

module.exports = {
  tableDefinition: validate(TYPES.TABLE_DEFINITION),
  sequenceDefinition: validate(TYPES.SEQUENCE_DEFINITION),
  tableReading: validate(TYPES.TABLE_READING),
  sequenceReading: validate(TYPES.SEQUENCE_READING),
}
