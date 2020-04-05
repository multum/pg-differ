/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const utils = require('./utils');
const helpers = require('./helpers');
const { ValidationError } = require('./errors');
const { Types, Columns, Constraints } = require('./constants');

exports.dataType = (type) => {
  const cutArray = utils.cutFromString(/\[]|\[\w+]/g, type);
  type = cutArray.rest.trim();

  const cutParams = utils.cutFromString(/\s?\([\w, ]+\)/, type);
  type = cutParams.rest.trim();

  type = Types.Aliases[type] || type;

  let components;
  if (cutParams.result) {
    const trimmedParams = cutParams.result[0].trim();
    let pairs = trimmedParams
      .substr(1, trimmedParams.length - 2)
      .split(',')
      .map((i) => (isNaN(i) ? i.trim() : Number(i)));

    if (type === Types.DataTypes.numeric) {
      const [precision, scale = 0] = pairs;
      pairs = [precision, scale];
      components = [type, precision, scale];
    } else {
      components = [type, ...pairs];
    }

    const paramsString = `(${pairs.join(',')})`;
    if (Types.Placeholders[type]) {
      type = Types.Placeholders[type].replace(/\[p]/, paramsString);
    } else {
      type += paramsString;
    }
  }

  const result = {
    raw: type,
    components: components || [type],
  };

  if (cutArray.result) {
    result.raw += cutArray.result.map(() => '[]').join('');
    result.dimensions = cutArray.result.length;
  }

  return result;
};

exports.literalDefaultValue = (value) => {
  if (typeof value === 'string') {
    value = value.replace(/(?<=^nextval\(')[^']+/, (sequence) => {
      return helpers.quoteObjectName(sequence);
    });
    return value.replace(/::[a-zA-Z ]+(?:\[\d+]|\[]){0,2}$/, '');
  } else {
    return value;
  }
};

exports.checkCondition = (definition) => definition.match(/[^(]+(?=\))/)[0];

const _normalizeIdentity = (type, value) => {
  if (utils.isObject(value)) {
    value = {
      ...Columns.getIdentityDefaults(type),
      ...value,
    };
  } else if (value) {
    value = { ...Columns.getIdentityDefaults(type) };
  }

  return value;
};

exports.encodeDefaultValue = (v) => {
  if (typeof v === 'string') {
    return helpers.escapeString(v);
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
      return helpers.escapeString(JSON.stringify(value));
    } else if (type === 'literal') {
      return exports.literalDefaultValue(value);
    }
  }

  return v;
};

exports.encodeConstraintType = (key) => {
  switch (key) {
    case 'primaryKey':
      return Constraints.Types.PRIMARY_KEY;
    case 'foreignKey':
      return Constraints.Types.FOREIGN_KEY;
    default:
      return key;
  }
};

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

exports.syncOptions = (options) => {
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

const _normalizeAllowClean = (object) => {
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

const _getConstraintsAndIndexes = (schema) => {
  const constraintsAndIndexes = utils.pick(
    ['indexes', 'unique', 'foreignKeys', 'checks'],
    schema
  );

  const result = Object.entries(constraintsAndIndexes).reduce(
    (acc, [type, elements]) => {
      if (elements) {
        type = exports.encryptedNamesListExtensions[type];
        let defaults;
        if (type === 'foreignKey') {
          defaults = { ...Constraints.ForeignKeyDefaults };
        }
        acc[type] = defaults
          ? elements.map((props) => ({ ...defaults, ...props }))
          : [...elements];
      }
      return acc;
    },
    {}
  );

  result.primaryKey = schema.primaryKey ? [schema.primaryKey] : null;

  return result;
};

const _shouldBePrimaryKey = (column, primaryKey) => {
  return (
    column.primary ||
    (primaryKey && primaryKey[0].columns.includes(column.name))
  );
};

exports.schema = (schema) => {
  const extensions = _getConstraintsAndIndexes(schema);

  const columns = Object.entries(schema.columns).map(([name, attributes]) => {
    let column;
    if (typeof attributes === 'string') {
      column = { name, type: attributes, ...Columns.getDefaults(attributes) };
    } else {
      column = { name, ...Columns.getDefaults(attributes.type), ...attributes };
    }

    if (column.primary) {
      if (extensions.primaryKey) {
        throw new ValidationError({
          path: `properties.columns['${column.name}']`,
          message: 'should be only one primary key',
        });
      } else {
        extensions.primaryKey = [{ columns: [column.name] }];
      }
    }

    if (column.identity || _shouldBePrimaryKey(column, extensions.primaryKey)) {
      column.nullable = false;
    }

    if (column.unique) {
      extensions.unique = (extensions.unique || []).push({
        columns: [column.name],
      });
    }

    column.type = exports.dataType(column.type);
    column.default = exports.encodeDefaultValue(column.default);
    column.identity = _normalizeIdentity(column.type.raw, column.identity);

    return column;
  });

  return {
    name: schema.name,
    columns,
    extensions,
  };
};

exports.name = (name) => {
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
