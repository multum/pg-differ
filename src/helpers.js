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
const parser = require('./parser');
const { ImportError } = require('./errors');

exports.loadJSON = (path, locals, interpolate) => {
  let file = fs.readFileSync(path, 'utf-8');
  if (locals && interpolate) {
    file = file.replace(interpolate, (match, value) => {
      const placeholder = R.path(value.split('.'), locals);
      if (utils.isExist(placeholder)) {
        return placeholder.replace(/"/g, '\\"'); // quotes escaping
      } else {
        return undefined;
      }
    });
  }
  return JSON.parse(file);
};

exports.removeQuotes = s => {
  return s.replace(/"/g, '');
};

exports.addQuotes = s => {
  return `"${s}"`;
};

const quoteIdentifier = s => {
  return exports.addQuotes(exports.removeQuotes(s));
};

exports.quoteIdentifier = quoteIdentifier;

exports.quoteObjectName = (n, defaultSchema) => {
  const [schema = defaultSchema, name] = parser.name(n);
  return `${quoteIdentifier(schema)}.${quoteIdentifier(name)}`;
};

exports.quoteLiteral = value => {
  const literal = value.slice(0); // create copy

  let hasBackslash = false;
  let quoted = `'`;

  for (let i = 0; i < literal.length; i++) {
    const c = literal[i];
    if (c === `'`) {
      quoted += c + c;
    } else if (c === '\\') {
      quoted += c + c;
      hasBackslash = true;
    } else {
      quoted += c;
    }
  }

  quoted += `'`;

  if (hasBackslash === true) {
    quoted = 'E' + quoted;
  }

  return quoted;
};

exports.readSchemas = ({
  path: pathString,
  locals,
  match = /.*\.schema.json$/,
  interpolate = /\${([\s\S]+?)}/g,
}) => {
  const _getFile = file => exports.loadJSON(file, locals, interpolate);
  if (fs.existsSync(pathString)) {
    const lstat = fs.lstatSync(pathString);
    if (lstat.isDirectory()) {
      return fs
        .readdirSync(pathString)
        .filter(file => match.test(file))
        .map(file => _getFile(path.join(pathString, file)));
    } else if (lstat.isFile()) {
      return [_getFile(pathString)];
    }
  } else {
    throw new ImportError(
      'File or folder is missing at the specified path',
      pathString
    );
  }
};
