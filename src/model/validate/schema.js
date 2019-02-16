/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const R = require('ramda')
const Ajv = require('ajv')

const ajv = new Ajv()
const validate = ajv.compile(require('./schema.json'))

const formatErrors = R.pipe(
  R.map(({ dataPath, message }) => `${dataPath} --- ${message}`),
  R.join('\n'),
)

module.exports = (schema) => {
  if (validate(schema)) {
    return schema
  } else {
    throw new Error(formatErrors(validate.errors))
  }
}
