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
  static increment(fullName) {
    return `nextval('${fullName}'::regclass)`;
  }

  static restart(fullName, value) {
    return `alter sequence ${fullName} restart with ${value};`;
  }

  static getCurrentValue(fullName) {
    return `select last_value as "currentValue" from ${fullName};`;
  }

  static hasCorrectCurrValue(fullName, min, max) {
    return `select exists ( 
      select last_value from ${fullName}
        where last_value between ${min} and ${max}
    ) as correct;`;
  }

  static alterOrCreate(operation, name, attributes) {
    const chunks = Object.entries(attributes)
      .map(([key, value]) => {
        switch (key) {
          case 'start':
            return value ? `start ${value}` : 'no start';
          case 'increment':
            return value
              ? `increment ${value}`
              : `increment ${DEFAULTS.increment}`;
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
      })
      .filter(Boolean);

    if (chunks.length) {
      chunks.unshift(`${operation} sequence ${name}`);
      return chunks.join(' ') + ';';
    }

    return null;
  }

  static drop(name) {
    return `drop sequence if exists ${name} cascade;`;
  }

  static create(name, attributes) {
    return QueryGenerator.alterOrCreate('create', name, attributes);
  }

  static alter(name, attributes) {
    return QueryGenerator.alterOrCreate('alter', name, attributes);
  }
}

module.exports = QueryGenerator;
