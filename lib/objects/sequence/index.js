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

const { Sequences } = require('../../constants');

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
  }

  _getCreateQuery(name) {
    const properties = utils.getDiff(this.properties, Sequences.getDefaults());
    return QueryGenerator.do('create', name, properties);
  }

  async _getChangeQueries(structure, options) {
    const fullName = this.getQuotedObjectName();
    if (options.force) {
      return new ChangeStorage([
        QueryGenerator.drop(fullName),
        this._getCreateQuery(fullName),
      ]);
    } else {
      if (structure) {
        const queries = new ChangeStorage();
        const diff = utils.getDiff(this.properties, structure);

        if (utils.isEmpty(diff)) return queries;

        Sequence.validateRangeUpdate(structure, diff);

        return queries.add(QueryGenerator.do('alter', fullName, diff));
      } else {
        return new ChangeStorage(this._getCreateQuery(fullName));
      }
    }
  }
}

module.exports = Sequence;
