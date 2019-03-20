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
const Sql = function () {
  let methods = null
  const lines = new Set()
  const store = []

  const add = (sql) => {
    if (R.is(Array, sql)) {
      sql.forEach(add)
    } else if (R.is(Object, sql)) {
      if (lines.add(sql.value)) {
        store.push(sql)
      }
    }
    return methods
  }

  const getSize = () => lines.size

  const getLines = (operations) => (
    operations ? getOperations(operations) : [ ...lines ]
  )

  const getOperations = (names) => {
    const filtered = store.filter(
      R.pipe(
        R.prop('operation'),
        R.includes(R.__, names),
      ),
    )
    return R.map(R.prop('value'), filtered)
  }

  return (methods = Object.freeze({ add, getLines, getSize }))
}

Sql.create = R.curry((operation, value) => value ? { operation, value } : null)

Sql.joinUniqueQueries = R.ifElse(
  R.isEmpty,
  R.always(null),
  R.pipe(R.uniq, R.join('\n')),
)

module.exports = Sql
