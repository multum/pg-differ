/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const R = require('ramda');
const fs = require('fs');

exports.isExist = value => value !== undefined && value !== null;

exports.findByName = (array, name, formerNames) =>
  array.find(el => {
    if (el.name === name) {
      return true;
    } else if (formerNames) {
      return formerNames.includes(el.name);
    }
    return false;
  });

exports.loadJSON = (path, locals, interpolate) => {
  let file = fs.readFileSync(path, 'utf-8');
  if (locals && interpolate) {
    file = file.replace(interpolate, (match, value) => {
      const placeholder = R.path(value.split('.'), locals);
      if (exports.isExist(placeholder)) {
        return placeholder;
      } else {
        throw new Error(`No placeholder found for '${match}'`);
      }
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
