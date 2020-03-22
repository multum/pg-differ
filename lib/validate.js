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

const validate = (schema) => {
  const validate = ajv.compile(schema);
  return (object) => {
    if (validate(object)) {
      return object;
    } else {
      const { dataPath, message } = validate.errors[0];
      throw new ValidationError({
        path: `properties${dataPath}`,
        message,
      });
    }
  };
};

module.exports = {
  table: validate(require('./schemas/define.table.json')),
  sequence: validate(require('./schemas/define.sequence.json')),
};
