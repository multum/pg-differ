/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const R = require('ramda');

const queries = require('./queries');
const parser = require('../parser');

function TableInfo(options) {
  const { client, name } = options;

  const getRows = (orderBy, range) =>
    client
      .query(queries.getRows(name, orderBy, range))
      .then(R.pipe(R.prop('rows')));

  const getChecks = (table = name) =>
    client.query(queries.getChecks(table)).then(
      R.pipe(
        R.prop('rows'),
        R.map(({ name, definition }) => ({
          name,
          condition: parser.checkCondition(definition),
        }))
      )
    );

  const _instance = {
    getRows,
    getChecks,
  };

  return Object.freeze(_instance);
}

module.exports = TableInfo;
