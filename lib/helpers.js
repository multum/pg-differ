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

  const _cache = {};
  const _getInterpolationValue = (path) => {
    let data;
    if (utils.has(path, _cache)) {
      data = _cache[path];
    } else {
      const value = utils.get(path, locals);
      data = {
        type: typeof value,
        value: utils.isExist(value) ? JSON.stringify(value) : null,
      };
      _cache[path] = data;
    }
    return data;
  };

  return files.map((path) => {
    let file = fs.readFileSync(path, 'utf-8');
    if (locals) {
      file = file
        .replace(interpolate, (match, path) => {
          let { type, value } = _getInterpolationValue(path);
          if (type === 'string') {
            value = value.slice(1, -1); // remove JSON string quotes
          }
          return value.replace(/"/g, '\\"'); // quotes escaping;
        })
        .replace(/{\s*"\$":\s*"([^}]+?)"\s*}/g, (match, path) => {
          const { value } = _getInterpolationValue(path);
          return value;
        });
    }
    return JSON.parse(file);
  });
};
