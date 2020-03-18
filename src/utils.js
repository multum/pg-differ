/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const R = require('ramda');

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

exports.getDiff = (object, exclude) => {
  return Object.keys(object).reduce((acc, key) => {
    const leftValue = object[key];
    const rightValue = exclude[key];
    if (String(leftValue) !== String(rightValue)) {
      acc[key] = leftValue;
    }
    return acc;
  }, {});
};

// exports.delay = delay => {
//   return new Promise(resolve => setTimeout(resolve, delay));
// };

exports.getCaller = () => {
  const traceFn = Error.prepareStackTrace;
  Error.prepareStackTrace = (err, stack) => stack;
  const stack = new Error().stack;
  Error.prepareStackTrace = traceFn;
  return stack[2].getFileName();
};

exports.isObject = target => {
  return target
    ? Object.prototype.toString.call(target) === '[object Object]'
    : false;
};

exports.findWhere = (props, arrayOfObjects) => {
  return arrayOfObjects.find(object => R.whereEq(props, object));
};

exports.isEmpty = target => {
  if (exports.isObject(target)) {
    target = Object.keys(target);
  }
  return target.length === 0;
};
