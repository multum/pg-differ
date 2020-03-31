/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const utils = require('../../utils');
const Sequences = require('../../constants/sequences');

class QueryGenerator {
  static getCurrentValue(name) {
    return `select last_value as "value" from ${name};`;
  }

  static setAttributes(properties) {
    const keys = ['increment', 'min', 'max', 'start', 'cycle'];
    return keys
      .map((key) => {
        if (Object.prototype.hasOwnProperty.call(properties, key)) {
          const value = properties[key];
          switch (key) {
            case 'start':
              return utils.isExist(value) ? `start ${value}` : null;
            case 'increment':
              return utils.isExist(value)
                ? `increment ${value}`
                : `increment ${Sequences.getDefaults().increment}`;
            case 'min':
              return utils.isExist(value) ? `minvalue ${value}` : 'no minvalue';
            case 'max':
              return utils.isExist(value) ? `maxvalue ${value}` : 'no maxvalue';
            case 'cycle':
              return value ? 'cycle' : 'no cycle';
          }
        }
      })
      .filter(Boolean);
  }

  static drop(name) {
    return `drop sequence if exists ${name} cascade;`;
  }

  static do(operation, name, properties) {
    properties = QueryGenerator.setAttributes(properties);

    return properties.length
      ? `${operation} sequence ${name} ` + properties.join(' ')
      : null;
  }
}

module.exports = QueryGenerator;
