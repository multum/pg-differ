/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

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

const Placeholders = {
  [DataTypes.timeStamp]: 'timestamp[p] without time zone',
  [DataTypes.timeStampTZ]: 'timestamp[p] with time zone',
  [DataTypes.time]: 'time[p] without time zone',
  [DataTypes.timeTZ]: 'time[p] with time zone',
};

const Aliases = {
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

module.exports = {
  Aliases,
  DataTypes,
  Placeholders,
};
