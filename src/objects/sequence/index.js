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
        QueryGenerator.do('create', fullName, this.properties),
      ]);
    } else {
      if (structure) {
        const queries = new ChangeStorage();
        const diff = utils.getDiff(this.properties, structure);

        if (utils.isEmpty(diff)) return queries;

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

        queries.add(QueryGenerator.do('alter', fullName, diff));

        return queries;
      } else {
        return new ChangeStorage(
          QueryGenerator.do('create', fullName, this.properties)
        );
      }
    }
  }
}

module.exports = Sequence;
