/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const R = require('ramda')

/**
 * @typedef {Object} Sql
 * @property {function} add
 * @property {function} getSize
 * @property {function} getLines
 */

/**
 * @returns {Sql}
 * @constructor
 */
const Sql = function (sql) {
  let _methods = null
  const _lines = new Set()
  const _store = []

  const add = (sql) => {
    if (R.is(Array, sql)) {
      sql.forEach(add)
    } else if (R.is(Object, sql)) {
      if (_lines.add(sql.value)) {
        _store.push(sql)
      }
    }
    return _methods
  }

  const getStore = () => [ ..._store ]

  const getSize = () => _lines.size

  const getLines = () => [ ..._lines ]

  if (sql) add(sql)

  return (_methods = Object.freeze({ add, getLines, getSize, getStore }))
}

Sql.create = R.curry((operation, value) => value ? { operation, value } : null)

Sql.joinUniqueQueries = R.ifElse(
  R.isEmpty,
  R.always(null),
  R.pipe(R.uniq, R.join('\n')),
)

module.exports = Sql
