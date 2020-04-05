/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const ChangeStorage = require('../../change-storage');
const utils = require('../../utils');
const { SynchronizationError } = require('../../errors');
const QueryGenerator = require('./query-generator');
const AbstractObject = require('../abstract');

class Sequence extends AbstractObject {
  static validateRangeUpdate(prev, next) {
    if (utils.isExist(next.min) || utils.isExist(next.max)) {
      if (next.min > prev.min || next.max < prev.max) {
        throw new SynchronizationError(
          `You cannot increase 'min' value or decrease 'max'`
        );
      }
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

  async _getChangeQueries(structure, options) {
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

        Sequence.validateRangeUpdate(structure, diff);

        return queries.add(this._QueryGenerator.alter(diff));
      } else {
        return new ChangeStorage(this._QueryGenerator.create());
      }
    }
  }
}

module.exports = Sequence;
