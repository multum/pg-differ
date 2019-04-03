/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @typedef {object} Sequence
 */

const utils = require('../utils')

/**
 *
 * @param {object} options
 * @returns {Sequence}
 */
module.exports = function (options) {
  let {
    tableName,
    columnName,
    increment = 1,
    minValue,
    maxValue,
    cycle,
  } = options

  cycle = cycle ? 'cycle' : 'no cycle'
  minValue = utils.isExist(minValue) ? `maxvalue ${minValue}` : 'no maxvalue'
  maxValue = utils.isExist(maxValue) ? `maxvalue ${maxValue}` : 'no maxvalue'

  const _create = () => (
    `create sequence ${tableName}_${columnName}_seq` +
    `increment ${increment}` +
    `${minValue}` +
    `${maxValue}` +
    `${cycle}`
  )

  const getChanges = () => (
    _create()
  )

  return Object.freeze({ getChanges })
}
