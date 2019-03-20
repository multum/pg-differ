/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @typedef {object} Seeds
 * @property {function} add
 * @property {function} inserts
 */

const parser = require('./parser')

/**
 *
 * @param {object} options
 * @returns {Seeds}
 */
module.exports = function (options) {
  const { table } = options
  let _seeds = []

  const add = (seeds) => {
    _seeds = _seeds.concat(seeds)
  }

  const inserts = () => _seeds.map(_insertSeed)

  const _insertSeed = (seed) => {
    const keys = []
    const values = []
    Object.entries(seed).forEach(([ key, value ]) => {
      value = parser.normalizeValue(value)
      keys.push(key)
      values.push(value)
    })
    return `insert into ${table} (${keys.join(', ')}) values (${values.join(', ')}) on conflict do nothing;`
  }

  return Object.freeze({ add, inserts })
}
