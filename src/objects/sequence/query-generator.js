/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const utils = require('../../utils');
const { DEFAULTS } = require('../../constants/sequences');

class QueryGenerator {
  static getCurrentValue(name) {
    return `select last_value as "value" from ${name};`;
  }

  static setAttribute(key, value) {
    switch (key) {
      case 'start':
        return utils.isExist(value) ? `start ${value}` : null;
      case 'increment':
        return utils.isExist(value)
          ? `increment ${value}`
          : `increment ${DEFAULTS.increment}`;
      case 'min':
        return utils.isExist(value) ? `minvalue ${value}` : 'no minvalue';
      case 'max':
        return utils.isExist(value) ? `maxvalue ${value}` : 'no maxvalue';
      case 'cycle':
        return value ? 'cycle' : 'no cycle';
      default:
        return null;
    }
  }

  static drop(name) {
    return `drop sequence if exists ${name} cascade;`;
  }

  static do(operation, name, properties) {
    properties = Object.entries(properties).map(([key, value]) => {
      return QueryGenerator.setAttribute(key, value);
    });

    properties = properties.filter(Boolean);

    return properties.length
      ? `${operation} sequence ${name} ` + properties.join(' ')
      : null;
  }
}

module.exports = QueryGenerator;
