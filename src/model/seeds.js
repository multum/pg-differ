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
 * @property {function} size
 */

const parser = require('../parser')

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
    const keys = Object.keys(seed)
    const values = Object.values(seed).map(parser.encodeValue)
    return `insert into ${table} (${keys.join(', ')}) values (${values.join(', ')}) on conflict do nothing;`
  }

  const size = () => _seeds.length

  return Object.freeze({ add, inserts, size })
}
