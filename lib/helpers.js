/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const utils = require('./utils');
const parser = require('./parser');
const { ImportError } = require('./errors');

exports.loadJSON = (path, locals, interpolate) => {
  let file = fs.readFileSync(path, 'utf-8');
  if (locals && interpolate) {
    file = file.replace(interpolate, (match, path) => {
      const value = utils.get(path, locals);
      if (typeof value === 'string') {
        return value.replace(/"/g, '\\"'); // quotes escaping;
      }
      return value;
    });
  }
  return JSON.parse(file);
};

const removeQuotes = (s) => s.replace(/"/g, '');
exports.removeQuotes = removeQuotes;

const addQuotes = (s) => `"${s}"`;
exports.addQuotes = addQuotes;

exports.quoteObjectName = (n, defaultSchema = 'public') => {
  const [schema = defaultSchema, name] = parser.name(n);
  return `${addQuotes(removeQuotes(schema))}.${addQuotes(removeQuotes(name))}`;
};

exports.escapeString = (value) => {
  const string = value.slice(0); // create copy

  let hasBackslash = false;
  let result = `'`;

  for (let i = 0; i < string.length; i++) {
    const c = string[i];
    if (c === `'`) {
      result += c + c;
    } else if (c === '\\') {
      result += c + c;
      hasBackslash = true;
    } else {
      result += c;
    }
  }

  result += `'`;

  if (hasBackslash === true) {
    result = 'E' + result;
  }

  return result;
};

exports.importSchemas = ({
  path: pathString,
  locals,
  pattern = /.*\.schema.json$/,
  interpolate = /\${([\s\S]+?)}/g,
}) => {
  const files = [];

  if (fs.existsSync(pathString)) {
    const lstat = fs.lstatSync(pathString);
    if (lstat.isDirectory()) {
      fs.readdirSync(pathString).forEach((file) => {
        if (pattern.test(file)) {
          files.push(path.join(pathString, file));
        }
      });
    } else if (lstat.isFile()) {
      files.push(pathString);
    }
  }

  if (utils.isEmpty(files)) {
    throw new ImportError(
      'Schema files not found at the specified path',
      pathString
    );
  }

  return files.map((file) => exports.loadJSON(file, locals, interpolate));
};
