/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const ChangeStorage = require('../../change-storage');
const utils = require('../../utils');
const QueryGenerator = require('./query-generator');
const AbstractObject = require('../abstract');

const { Sequences } = require('../../constants');

class Sequence extends AbstractObject {
  constructor(differ, properties) {
    super(differ, { ...Sequences.DEFAULTS, ...properties });
    this.type = 'sequence';
  }

  async _getChangeQueries(structure, options) {
    const fullName = this.getQuotedFullName();
    if (options.force) {
      return new ChangeStorage([
        QueryGenerator.drop(fullName),
        QueryGenerator.create(fullName, this.properties),
      ]);
    } else {
      if (structure) {
        const diff = utils.getObjectDifference(this.properties, structure);
        if (utils.isExist(diff.min) || utils.isExist(diff.max)) {
          const {
            rows: [{ correct }],
          } = await this._client.query(
            QueryGenerator.hasCorrectCurrValue(
              fullName,
              this.properties.min,
              this.properties.max
            )
          );
          if (!correct) {
            diff.current = this.properties.min;
          }
        }
        return new ChangeStorage(QueryGenerator.alter(fullName, diff));
      } else {
        return new ChangeStorage(
          QueryGenerator.create(fullName, this.properties)
        );
      }
    }
  }

  _getIncrementQuery() {
    return QueryGenerator.increment(this.getQuotedFullName());
  }

  _getRestartQuery(value) {
    return QueryGenerator.restart(this.getQuotedFullName(), value);
  }

  _getCurrentValue() {
    return this._client
      .query(QueryGenerator.getCurrentValue(this.getQuotedFullName()))
      .then(({ rows: [{ currentValue }] }) => currentValue);
  }
}

module.exports = Sequence;
