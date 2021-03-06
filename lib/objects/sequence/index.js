/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const ChangeStorage = require('../../change-storage');
const utils = require('../../utils');
const parser = require('../../parser');
const QueryGenerator = require('./query-generator');
const AbstractObject = require('../abstract');

class Sequence extends AbstractObject {
  static getRestartValue({ min, max }, lastValue) {
    const last = BigInt(lastValue);
    if (last < BigInt(min) || last > BigInt(max)) {
      return min;
    }
  }

  constructor(differ, properties) {
    super(differ, properties);
    this.type = 'sequence';
    this._QueryGenerator = new QueryGenerator(this);

    const { attributes } = parser.schema(this.type, properties);
    this._attributes = attributes;
  }

  async _getChangeQueries(client, structure, options) {
    if (options.force) {
      return new ChangeStorage([
        this._QueryGenerator.drop(),
        this._QueryGenerator.create(),
      ]);
    } else {
      if (structure) {
        const queries = new ChangeStorage();
        const diff = utils.getDiff(this._attributes, structure);

        if (utils.isEmptyObject(diff)) return queries;

        if (utils.has('min', diff) || utils.has('max', diff)) {
          const {
            rows: [{ value: lastValue }],
          } = await client.query(
            QueryGenerator.getLastValue(this.getObjectName())
          );
          const restartValue = Sequence.getRestartValue(
            this._attributes,
            lastValue
          );
          if (utils.isExist(restartValue)) {
            diff.restart = restartValue;
          }
        }

        return queries.add(this._QueryGenerator.alter(diff));
      } else {
        return new ChangeStorage(this._QueryGenerator.create());
      }
    }
  }
}

module.exports = Sequence;
