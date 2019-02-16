/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const R = require('ramda')

exports.isExist = R.compose(R.not, R.isNil)

exports.notEmpty = R.compose(R.not, R.isEmpty)

exports.findByName = (array, name) => R.find(R.propEq('name', name), array)

exports.filterByProp = R.curry((prop, props, array) => (
  R.filter(R.pipe(
    R.prop(prop),
    R.includes(R.__, props),
  ), array)
))
