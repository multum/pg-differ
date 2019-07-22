/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const R = require('ramda')
const fs = require('fs')

exports.isExist = R.compose(R.not, R.isNil)

exports.notEmpty = R.compose(R.not, R.isEmpty)

exports.omitInObject = R.curry((keys, arrayOfObjects) => arrayOfObjects.map(R.omit(keys)))

exports.findByName = (array, name, formerNames) => R.find((el) => {
  if (el.name === name) {
    return true
  } else if (formerNames) {
    return R.includes(el.name, formerNames)
  }
  return false
}, array)

exports.loadJSON = (path, placeholders) => {
  let file = fs.readFileSync(path, 'utf-8')
  if (placeholders) {
    Object.entries(placeholders).forEach(([ name, value ]) => {
      const regExp = `\\$\{${name}\\}`
      file = file.replace(new RegExp(regExp, 'g'), value)
    })
  }
  return JSON.parse(file)
}

exports.sortByList = R.curry((getter, orderList, array) => {
  const { length } = array
  const indexOf = (el) => orderList.indexOf(getter ? getter(el) : el) + 1 || length
  return array.sort((a, b) => indexOf(a) - indexOf(b))
})
