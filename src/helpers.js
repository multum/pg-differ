/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const fs = require('fs');
const R = require('ramda');
const path = require('path');
const utils = require('./utils');

exports.loadJSON = (path, locals, interpolate) => {
  let file = fs.readFileSync(path, 'utf-8');
  if (locals && interpolate) {
    file = file.replace(interpolate, (match, value) => {
      const placeholder = R.path(value.split('.'), locals);
      if (utils.isExist(placeholder)) {
        return placeholder;
      } else {
        throw new Error(`No placeholder found for '${match}'`);
      }
    });
  }
  return JSON.parse(file);
};

exports.readSchemas = ({
  path: pathString,
  locals,
  match = /.*\.schema.json$/,
  interpolate = /\${([\s\S]+?)}/g,
}) => {
  const _getFile = file => exports.loadJSON(file, locals, interpolate);
  const lstat = fs.lstatSync(pathString);
  if (lstat.isDirectory()) {
    return fs
      .readdirSync(pathString)
      .filter(file => match.test(file))
      .map(file => _getFile(path.join(pathString, file)));
  } else if (lstat.isFile()) {
    return [_getFile(pathString)];
  }
};
