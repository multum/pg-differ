/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const utils = require('../../utils');
const helpers = require('../../helpers');
const Sequences = require('../../constants/sequences');

class QueryGenerator {
  constructor(sequence) {
    this.sequence = sequence;
  }

  static getCurrentValue(name) {
    name = helpers.quoteObjectName(name);
    return `select last_value as "value" from ${name};`;
  }

  static setAttributes(properties) {
    return ['increment', 'min', 'max', 'start', 'cycle']
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

  drop() {
    const sequence = this.sequence.getQuotedObjectName();
    return `drop sequence if exists ${sequence} cascade;`;
  }

  create() {
    const sequence = this.sequence.getQuotedObjectName();
    const properties = QueryGenerator.setAttributes(
      utils.getDiff(this.sequence.properties, Sequences.getDefaults())
    );
    if (properties.length === 0) {
      return `create sequence ${sequence};`;
    } else {
      return `create sequence ${sequence} ` + properties.join(' ') + ';';
    }
  }

  alter(diff) {
    const sequence = this.sequence.getQuotedObjectName();
    const properties = QueryGenerator.setAttributes(diff);
    if (utils.isExist(diff.restart)) {
      properties.push(`restart with ${diff.restart}`);
    }
    return properties.length
      ? `alter sequence ${sequence} ` + properties.join(' ') + ';'
      : null;
  }
}

module.exports = QueryGenerator;
