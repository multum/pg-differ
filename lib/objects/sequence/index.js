/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const ChangeStorage = require('../../change-storage');
const utils = require('../../utils');
const Sequences = require('../../constants/sequences');
const QueryGenerator = require('./query-generator');
const AbstractObject = require('../abstract');

class Sequence extends AbstractObject {
  static getRestartValue({ currentValue, min, max }) {
    const current = BigInt(currentValue);
    if (current < BigInt(min) || current > BigInt(max)) {
      return min;
    }
  }

  constructor(differ, properties) {
    super(differ, properties);
    this.type = 'sequence';
    this._QueryGenerator = new QueryGenerator(this);

    this._attributes = utils.pick(
      ['increment', 'min', 'max', 'start', 'cycle'],
      properties
    );
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

        if (utils.isEmpty(diff)) return queries;

        if ([diff.min, diff.max].some(utils.isExist)) {
          const {
            rows: [{ value: currentValue }],
          } = await client.query(
            QueryGenerator.getCurrentValue(this.getObjectName())
          );
          diff.restart = Sequence.getRestartValue({
            ...Sequences.getDefaults(),
            ...this._attributes,
            currentValue,
          });
        }

        return queries.add(this._QueryGenerator.alter(diff));
      } else {
        return new ChangeStorage(this._QueryGenerator.create());
      }
    }
  }
}

module.exports = Sequence;
