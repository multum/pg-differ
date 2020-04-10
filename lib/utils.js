/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const util = require('util');

exports.isExist = (value) => value !== undefined && value !== null;

exports.findByName = (array, name, formerNames) =>
  array.find((el) => {
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

exports.getCaller = () => {
  const traceFn = Error.prepareStackTrace;
  Error.prepareStackTrace = (err, stack) => stack;
  const stack = new Error().stack;
  Error.prepareStackTrace = traceFn;
  return stack[2].getFileName();
};

exports.isObject = (target) => {
  return target
    ? Object.prototype.toString.call(target) === '[object Object]'
    : false;
};

exports.pick = (keys, object) => {
  return keys.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      acc[key] = object[key];
    }
    return acc;
  }, {});
};

exports.get = (path, obj) => {
  if (typeof path === 'string') {
    path = path.replace(/^\[|]/g, '').replace(/\[/g, '.').split('.');
  }

  let index = 0;
  const length = path.length;
  while (exports.isExist(obj) && index < length) {
    obj = obj[path[index++]];
  }

  return index && index === length ? obj : undefined;
};

exports.omit = (keys, object) => {
  return keys.reduce(
    (acc, key) => {
      delete acc[key];
      return acc;
    },
    { ...object }
  );
};

exports.findWhere = (props, arrayOfObjects) => {
  const keys = Object.keys(props);
  return arrayOfObjects.find((object) => {
    object = exports.pick(keys, object);
    return util.isDeepStrictEqual(object, props);
  });
};

exports.isEmpty = (target) => {
  if (exports.isObject(target)) {
    target = Object.keys(target);
  }
  return target.length === 0;
};

exports.unnest = (array) => {
  return array.reduce((acc, i) => acc.concat(i), []);
};

exports.once = (fn) => {
  let result;
  let called = false;
  return function () {
    if (called) return result;
    called = true;
    result = fn.apply(this, arguments);
    return result;
  };
};

exports.cutFromString = (regexp, target) => {
  let rest;
  const result = target.match(regexp);
  if (result) {
    rest = target.replace(regexp, '');
  } else {
    rest = target;
  }
  return { result, rest };
};
