/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const Ajv = require('ajv');

const ajv = new Ajv();

const formatErrors = errors =>
  errors
    .map(
      ({ dataPath, message }) => (dataPath ? `[ ${dataPath} ] ` : '') + message
    )
    .join('\n\t');

const validate = schema => {
  const validate = ajv.compile(schema);
  return object => {
    if (validate(object)) {
      return object;
    } else {
      throw new Error(formatErrors(validate.errors));
    }
  };
};

module.exports = {
  tableDefinition: validate(require('./schemas/define.table.json')),
  sequenceDefinition: validate(require('./schemas/define.sequence.json')),
  tableReading: validate(require('./schemas/read.table.json')),
  sequenceReading: validate(require('./schemas/read.sequence.json')),
};
