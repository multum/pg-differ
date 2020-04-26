/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const Types = require('../types');

const MaxValues = {
  [Types.smallint]: '32767',
  [Types.integer]: '2147483647',
  [Types.bigint]: '9223372036854775807',
};

const getDefaults = (dataType = Types.bigint) => {
  return {
    start: '1',
    increment: '1',
    cycle: false,
    min: '1',
    max: MaxValues[dataType],
  };
};

module.exports = { getDefaults };
