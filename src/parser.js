/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const R = require('ramda');
const utils = require('./utils');
const helpers = require('./helpers');
const { ValidationError } = require('./errors');
const { Types, Columns, Extensions, Sequences } = require('./constants');

exports.getTypeGroup = type => {
  if (type) {
    type = exports.trimType(type);
    return Object.values(Types.GROUPS).find(group => group.includes(type));
  }
};

const regExpTypeOptions = /\[]|\[\w+]|\(\w+\)|'(\w+|\d+)'/g;

exports.trimType = type => type.replace(regExpTypeOptions, '').trim();

exports.normalizeType = type => {
  const values = type.match(regExpTypeOptions) || [];
  type = exports.trimType(type);

  // decode type alias
  const aliasDescription = Types.ALIASES[type];
  if (utils.isExist(aliasDescription)) {
    type = Types.ALIASES[type];
  }
  return values ? `${type}${values.join('')}` : type;
};

exports.defaultValueInformationSchema = value => {
  switch (typeof value) {
    case 'string': {
      value = value.replace(/(?<=nextval\(')[^']+/, sequence => {
        return helpers.quoteObjectName(sequence, 'public');
      });
      return value.replace(/::[a-zA-Z ]+(?:\[\d+]|\[]){0,2}$/, '');
    }
    default: {
      return value;
    }
  }
};

exports.checkCondition = definition => definition.match(/[^(]+(?=\))/)[0];

exports.normalizeAutoIncrement = value => {
  if (R.is(Object, value)) {
    return {
      ...Sequences.DEFAULTS,
      ...value,
    };
  } else if (value) {
    return { ...Sequences.DEFAULTS };
  }
  return value;
};

exports.encodeValue = v => {
  if (typeof v === 'string') {
    return exports.quoteLiteral(v);
  }
  const isArray = Array.isArray(v);
  const isObject = utils.isObject(v);

  if (isArray || isObject) {
    let type, value;
    if (isArray) {
      [type, value] = v;
    } else {
      type = v.type;
      value = v.value;
    }
    if (type === 'json') {
      return exports.quoteLiteral(JSON.stringify(value));
    } else if (type === 'literal') {
      return value;
    }
  }
  return v;
};

const _encodeExtensionTypes = {
  primaryKey: Extensions.TYPES.PRIMARY_KEY,
  unique: Extensions.TYPES.UNIQUE,
  foreignKey: Extensions.TYPES.FOREIGN_KEY,
  index: Extensions.TYPES.INDEX,
  check: Extensions.TYPES.CHECK,
};

exports.encodeExtensionType = key => _encodeExtensionTypes[key] || null;

const _defaultSyncOptions = {
  transaction: true,
  force: false,
  cleanable: {
    primaryKey: true,
    foreignKey: false,
    unique: false,
    check: false,
    index: false,
  },
};

exports.encryptedNamesListExtensions = {
  primaryKeys: 'primaryKey',
  indexes: 'index',
  foreignKeys: 'foreignKey',
  checks: 'check',
  unique: 'unique',
};

const _getExtensionDefaults = type => {
  if (type === 'foreignKey') {
    return { ...Extensions.FOREIGN_KEY_DEFAULTS };
  }
};

exports.syncOptions = options => {
  if (options) {
    return {
      ..._defaultSyncOptions,
      ...options,
      cleanable: _normalizeCleanableObject(options.cleanable),
    };
  } else {
    return _defaultSyncOptions;
  }
};

const _normalizeCleanableObject = object => {
  if (object) {
    const encrypted = Object.entries(object).reduce(
      (acc, [listName, value]) => {
        acc[exports.encryptedNamesListExtensions[listName]] = value;
        return acc;
      },
      {}
    );
    return { ..._defaultSyncOptions.cleanable, ...encrypted };
  }
  return _defaultSyncOptions.cleanable;
};

exports.schema = schema => {
  const columns = schema.columns.map(column => {
    column = { ...Columns.DEFAULTS, ...column };

    const type = exports.normalizeType(column['type']);
    const defaultValue = exports.encodeValue(column.default);
    const autoIncrement = exports.normalizeAutoIncrement(column.autoIncrement);

    return {
      ...column,
      type,
      autoIncrement,
      default: defaultValue,
    };
  });

  const extensions = R.pipe(
    R.pick(['indexes', 'unique', 'foreignKeys', 'primaryKeys']), // without 'checks'
    R.toPairs,
    R.reduce((acc, [type, elements]) => {
      if (elements) {
        type = exports.encryptedNamesListExtensions[type];
        const defaults = _getExtensionDefaults(type);
        acc[type] = defaults
          ? elements.map(props => ({ ...defaults, ...props }))
          : elements;
      }
      return acc;
    }, {}),
    R.mergeWith(R.concat, _getExtensionsFromColumns(columns))
  )(schema);

  return {
    name: schema.name,
    checks: schema.checks,
    columns,
    extensions,
  };
};

const _getExtensionsFromColumns = columns => {
  return columns.reduce((acc, column) => {
    ['unique', 'primaryKey'].forEach(key => {
      if (column[key] === true) {
        acc[key] = acc[key] || [];
        acc[key].push({ columns: [column.name] });
      }
    });
    return acc;
  }, {});
};

exports.quoteLiteral = value => {
  const literal = value.slice(0); // create copy

  let hasBackslash = false;
  let quoted = "'";

  for (let i = 0; i < literal.length; i++) {
    const c = literal[i];
    if (c === "'") {
      quoted += c + c;
    } else if (c === '\\') {
      quoted += c + c;
      hasBackslash = true;
    } else {
      quoted += c;
    }
  }

  quoted += "'";

  if (hasBackslash === true) {
    quoted = 'E' + quoted;
  }

  return quoted;
};

exports.name = name => {
  const chunks = (name || '').split('.');
  const { length } = chunks;
  if (length === 1 || length === 2) {
    return chunks.length === 2 // [schema, name]
      ? [chunks[0], chunks[1]]
      : [undefined, chunks[0]];
  }
  throw new ValidationError([
    {
      path: 'properties.name',
      message: `Invalid object name: '${name}'`,
    },
  ]);
};
