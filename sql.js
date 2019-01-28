const R = require('ramda')
const utils = require('./utils')

/**
 * @typedef {Object} Sql
 * @property {function} add
 * @property {function} getLines
 * @property {function} getOperations
 */

/**
 * @returns {Sql}
 * @constructor
 */
const Sql = function () {
  const lines = new Set()
  const store = []

  let methods = null

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

  const size = () => lines.size

  const getLines = () => [ ...lines ]

  const getOperations = R.pipe(
    utils.filterByProp('operation', R.__, store),
    R.map(R.prop('value')),
  )

  methods = Object.freeze({ add, getLines, getOperations, size })

  return methods
}

Sql.create = R.curry((operation, value) => value ? { operation, value } : null)

Sql.uniqueQueries = R.ifElse(
  utils.notEmpty,
  R.pipe(
    R.uniq,
    R.join('\n'),
  ),
  R.always(null),
)

module.exports = Sql
