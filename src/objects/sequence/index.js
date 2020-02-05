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
const validate = require('../../validate');

const { Sequences } = require('../../constants');

class Sequence extends AbstractObject {
  constructor(differ, properties) {
    super(differ, { ...Sequences.DEFAULTS, ...properties });
    this.type = 'sequence';
    try {
      validate.sequenceDefinition(properties);
    } catch (error) {
      throw new Error(this._logger.formatMessage(error.message));
    }
  }

  async _getChangeQueries(structure, options) {
    const fullName = this.getFullName();
    if (options.force) {
      return new ChangeStorage([
        QueryGenerator.drop(fullName),
        QueryGenerator.create(fullName, this._properties),
      ]);
    } else {
      if (structure) {
        const diff = utils.getObjectDifference(this._properties, structure);
        if (utils.isExist(diff.min) || utils.isExist(diff.max)) {
          const {
            rows: [{ correct }],
          } = await this._client.query(
            QueryGenerator.hasCorrectCurrValue(
              fullName,
              this._properties.min,
              this._properties.max
            )
          );
          if (!correct) {
            diff.current = this._properties.min;
          }
        }
        return new ChangeStorage(QueryGenerator.alter(fullName, diff));
      } else {
        return new ChangeStorage(
          QueryGenerator.create(fullName, this._properties)
        );
      }
    }
  }

  _getIncrementQuery() {
    return QueryGenerator.increment(this.getFullName());
  }

  _getRestartQuery(value) {
    return QueryGenerator.restart(this.getFullName(), value);
  }

  _getCurrentValue() {
    return this._client
      .query(QueryGenerator.getCurrentValue(this.getFullName()))
      .then(({ rows: [{ currentValue }] }) => currentValue);
  }
}

module.exports = Sequence;
