/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const DEFAULTS = {
  start: 1,
  increment: 1,
  cycle: false,
  max: '9223372036854775807',
  min: 1,
}

const ATTRIBUTES = [ 'start', 'increment', 'min', 'max', 'cycle' ]

module.exports = { DEFAULTS, ATTRIBUTES }
