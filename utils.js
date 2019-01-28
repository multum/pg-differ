const R = require('ramda')

const isExist = R.compose(R.not, R.isNil)

const notEmpty = R.compose(R.not, R.isEmpty)

const allNotEmpty = R.all(notEmpty)

const findByName = (array, name) => R.find(R.propEq('name', name), array)

const filterByProp = R.curry((prop, props, array) => (
  R.filter(R.pipe(
    R.prop(prop),
    R.includes(R.__, props),
  ), array)
))

const filterByTypes = filterByProp('type')

module.exports = {
  findByName,
  isExist,
  notEmpty,
  allNotEmpty,
  filterByTypes,
  filterByProp,
}
