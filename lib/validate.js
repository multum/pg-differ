/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const Ajv = require('ajv');
const { ValidationError } = require('./errors');

const ajv = new Ajv();

const createValidator = (schema) => {
  const validate = ajv.compile(schema);
  return (name, value) => {
    if (validate(value)) {
      return value;
    } else {
      const { dataPath, message } = validate.errors[0];
      throw new ValidationError({
        path: name + dataPath,
        message,
      });
    }
  };
};

module.exports = {
  table: createValidator(require('./schemas/define.table.json')),
  sequence: createValidator(require('./schemas/define.sequence.json')),
};
