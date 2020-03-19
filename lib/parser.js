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
const {
  DataTypes,
  DataTypeAliases,
  TypePlaceholders,
  Columns,
  Extensions,
} = require('./constants');

exports.columnType = target => {
  const params = target.match(/\s?\([\w, ]+\)/);

  const arraySymbolsMatch = target.match(/\[]|\[\w+]/g);
  if (arraySymbolsMatch) {
    target = target.replace(arraySymbolsMatch, '').trim();
  }

  let type = target;
  let components;

  if (params) {
    type = type.replace(params, '');
  }
  const alias = DataTypeAliases[type];
  type = alias || type;

  if (params) {
    let pairs = params[0].trim();
    pairs = pairs
      .trim()
      .substr(1, pairs.length - 2)
      .split(',')
      .map(i => (isNaN(i) ? i.trim() : Number(i)));

    if (type === DataTypes.numeric) {
      const [precision, scale = 0] = pairs;
      components = [type, precision, scale];
    } else {
      components = [type, ...pairs];
    }

    const paramsString = `(${pairs.join(',')})`;
    if (TypePlaceholders[type]) {
      type = TypePlaceholders[type].replace(/\[p]/, paramsString);
    } else {
      type = target.replace(params, paramsString);
    }
  }

  if (arraySymbolsMatch) {
    type += arraySymbolsMatch.join('');
  }
  return { raw: type, components: components || [type] };
};

exports.defaultValueInformationSchema = value => {
  if (value) {
    value = value.replace(/(?<=nextval\(')[^']+/, sequence => {
      return helpers.quoteObjectName(sequence, 'public');
    });
    return value.replace(/::[a-zA-Z ]+(?:\[\d+]|\[]){0,2}$/, '');
  } else {
    return value;
  }
};

exports.checkCondition = definition => definition.match(/[^(]+(?=\))/)[0];

const _normalizeIdentity = value => {
  if (utils.isObject(value)) {
    value = {
      ...Columns.IDENTITY_DEFAULTS,
      ...value,
    };
  } else if (value) {
    value = { ...Columns.IDENTITY_DEFAULTS };
  }

  return value;
};

const _encodeValue = v => {
  if (typeof v === 'string') {
    return helpers.quoteLiteral(v);
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
      return helpers.quoteLiteral(JSON.stringify(value));
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
  adjustIdentitySequences: false,
  allowClean: {
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
      allowClean: _normalizeAllowClean(options.allowClean),
    };
  } else {
    return _defaultSyncOptions;
  }
};

const _normalizeAllowClean = object => {
  if (object) {
    const encrypted = Object.entries(object).reduce(
      (acc, [listName, value]) => {
        acc[exports.encryptedNamesListExtensions[listName]] = value;
        return acc;
      },
      {}
    );
    return { ..._defaultSyncOptions.allowClean, ...encrypted };
  }
  return _defaultSyncOptions.allowClean;
};

exports.schema = schema => {
  let columns = schema.columns;

  if (utils.isObject(columns)) {
    columns = Object.entries(columns).map(([name, attributes]) => {
      if (typeof attributes === 'string') {
        return {
          name,
          type: attributes,
        };
      }
      return {
        name,
        ...attributes,
      };
    });
  }

  const extensions = R.pipe(
    R.pick(['indexes', 'unique', 'foreignKeys', 'checks']),
    R.toPairs,
    R.reduce((acc, [type, elements]) => {
      if (elements) {
        type = exports.encryptedNamesListExtensions[type];
        const defaults = _getExtensionDefaults(type);
        acc[type] = defaults
          ? elements.map(props => ({ ...defaults, ...props }))
          : [...elements];
      }
      return acc;
    }, {})
  )(schema);

  let primaryKey = schema.primaryKey;

  columns = columns.map(column => {
    column = { ...Columns.DEFAULTS, ...column };

    if (column.primary) {
      if (primaryKey) {
        throw new ValidationError({
          path: `properties.columns['${column.name}']`,
          message: `table '${schema.name}' must have only one primary key`,
        });
      } else {
        primaryKey = { columns: [column.name] };
      }
    }

    if (
      column.identity ||
      column.primary ||
      (primaryKey && primaryKey.columns.includes(column.name))
    ) {
      column.shouldBeNullable = true;
    } else {
      column.shouldBeNullable = false;
    }

    if (column.unique) {
      extensions.unique = (extensions.unique || []).push({
        columns: [column.name],
      });
    }

    column.type = exports.columnType(column.type);
    column.default = _encodeValue(column.default);
    column.identity = _normalizeIdentity(column.identity);

    return column;
  });

  extensions.primaryKey = primaryKey ? [primaryKey] : null;

  return {
    name: schema.name,
    columns,
    extensions,
  };
};

exports.name = name => {
  const chunks = (name || '').split('.');
  const { length } = chunks;
  if (length === 1 || length === 2) {
    return chunks.length === 2 // [schema, name]
      ? [chunks[0], chunks[1]]
      : [undefined, chunks[0]];
  }
  throw new ValidationError({
    path: 'properties.name',
    message: 'invalid value',
  });
};
