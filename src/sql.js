/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const R = require('ramda');

/**
 * @typedef {Object} Sql
 * @property {function} add
 * @property {function} getSize
 * @property {function} getLines
 * @property {function} getStore
 * @property {function} join
 */

/**
 * @returns {Sql}
 * @constructor
 */
const Sql = function(sql) {
  let _methods = null;
  const _lines = new Set();
  const _store = [];

  const add = sql => {
    if (R.is(Array, sql)) {
      sql.forEach(add);
    } else if (R.is(Object, sql)) {
      if (_lines.add(sql.value)) {
        _store.push(sql);
      }
    }
    return _methods;
  };

  const getStore = () => [..._store];

  const getSize = () => _lines.size;

  const getLines = () => [..._lines];

  const join = (separator = '\n') => getLines().join(separator);

  if (sql) {
    add(sql);
  }

  return (_methods = Object.freeze({ add, getLines, getSize, getStore, join }));
};

Sql.create = R.curry((operation, value) =>
  value ? { operation, value } : null
);

module.exports = Sql;
