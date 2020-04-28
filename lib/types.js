/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const utils = require('./utils');

const DataTypes = {
  bigint: 'bigint',
  bitVarying: 'bit varying',
  boolean: 'boolean',
  characterVarying: 'character varying',
  character: 'character',
  text: 'text',
  doublePrecision: 'double precision',
  integer: 'integer',
  numeric: 'numeric',
  real: 'real',
  smallint: 'smallint',
  time: 'time without time zone',
  timeTZ: 'time with time zone',
  timeStamp: 'timestamp without time zone',
  timeStampTZ: 'timestamp with time zone',
};

const _placeholders = {
  [DataTypes.timeStamp]: 'timestamp[p] without time zone',
  [DataTypes.timeStampTZ]: 'timestamp[p] with time zone',
  [DataTypes.time]: 'time[p] without time zone',
  [DataTypes.timeTZ]: 'time[p] with time zone',
};

const _aliases = {
  int8: DataTypes.bigint,
  varbit: DataTypes.bitVarying,
  bool: DataTypes.boolean,
  char: DataTypes.character,
  varchar: DataTypes.characterVarying,
  float8: DataTypes.doublePrecision,
  int4: DataTypes.integer,
  int: DataTypes.integer,
  decimal: DataTypes.numeric,
  float4: DataTypes.real,
  int2: DataTypes.smallint,
  time: DataTypes.time,
  timetz: DataTypes.timeTZ,
  timestamp: DataTypes.timeStamp,
  timestamptz: DataTypes.timeStampTZ,
};

const parse = (type) => {
  const cutArray = utils.cutFromString(/\[]|\[\w+]/g, type);
  type = cutArray.rest;

  const cutArgs = utils.cutFromString(/\((\(.*\)|.)*?\)/, type);
  type = cutArgs.rest;

  type = type.replace(/\s\s+/g, ' ').trim();

  const name = _aliases[type] || type;
  type = name;

  let args = [];
  if (cutArgs.result) {
    args = cutArgs.result[0]
      .slice(1, -1)
      .split(',')
      .map((i) => (isNaN(i) ? i.trim() : Number(i)));

    if (name === DataTypes.numeric) {
      args[1] = args[1] || 0; // [precision, scale = 0]
    }

    const argsString = `(${args.join(',')})`;
    if (_placeholders[name]) {
      type = _placeholders[name].replace(/\[p]/, argsString);
    } else {
      type = name + argsString;
    }
  }

  const result = {
    name,
    arguments: args,
    pure: type,
  };

  if (cutArray.result) {
    result.dimensions = cutArray.result.length;
    result.pure += '[]'.repeat(result.dimensions);
  }

  return result;
};

Object.defineProperty(DataTypes, 'parse', {
  value: parse,
  enumerable: false,
  configurable: true,
});

module.exports = DataTypes;
