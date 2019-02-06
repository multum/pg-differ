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
