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

  static hasCorrectCurrValue(name, min, max) {
    return `select exists ( 
      select last_value from ${name}
        where last_value between ${min} and ${max}
    ) as correct;`;
  }

  static setAttribute(key, value) {
    switch (key) {
      case 'start':
        return value ? `start ${value}` : null;
      case 'increment':
        return value ? `increment ${value}` : `increment ${DEFAULTS.increment}`;
      case 'min':
        return value ? `minvalue ${value}` : 'no minvalue';
      case 'max':
        return value ? `maxvalue ${value}` : 'no maxvalue';
      case 'cycle':
        return value ? 'cycle' : 'no cycle';
      case 'current':
        return utils.isExist(value) ? `restart with ${value}` : null;
      default:
        return null;
    }
  }

  static drop(name) {
    return `drop sequence if exists ${name} cascade;`;
  }

  static do(operation, name, attributes) {
    attributes = Object.entries(attributes).map(([key, value]) => {
      return QueryGenerator.setAttribute(key, value);
    });

    attributes = attributes.filter(Boolean);

    return attributes.length
      ? `${operation} sequence ${name} ` + attributes.join(' ')
      : null;
  }
}

module.exports = QueryGenerator;
