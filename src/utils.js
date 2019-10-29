/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const R = require('ramda');
const fs = require('fs');

exports.isExist = value => !R.isNil(value);

exports.isNotEmpty = value => !R.isEmpty(value);

exports.findByName = (array, name, formerNames) =>
  array.find(el => {
    if (el.name === name) {
      return true;
    } else if (formerNames) {
      return formerNames.includes(el.name);
    }
    return false;
  });

exports.loadJSON = (path, placeholders) => {
  let file = fs.readFileSync(path, 'utf-8');
  if (placeholders) {
    Object.entries(placeholders).forEach(([name, value]) => {
      const regExp = `\\$\{${name}\\}`;
      file = file.replace(new RegExp(regExp, 'g'), String(value));
    });
  }
  return JSON.parse(file);
};

exports.sortByList = R.curry((getter, orderList, array) => {
  const { length } = array;
  const indexOf = el =>
    orderList.indexOf(getter ? getter(el) : el) + 1 || length;
  return array.sort((a, b) => indexOf(a) - indexOf(b));
});
