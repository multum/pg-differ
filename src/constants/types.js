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
  doublePrecision: 'double precision',
  integer: 'integer',
  numeric: 'numeric',
  real: 'real',
  smallint: 'smallint',
  time: 'time without time zone',
  timeZ: 'time with time zone',
  timeStamp: 'timestamp without time zone',
  timeStampZ: 'timestamp with time zone',
};

const TypePlaceholders = {
  [DataTypes.timeStamp]: 'timestamp[p] without time zone',
  [DataTypes.timeStampZ]: 'timestamp[p] with time zone',
  [DataTypes.time]: 'time[p] without time zone',
  [DataTypes.timeZ]: 'time[p] with time zone',
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
  timez: DataTypes.timeZ,
  timestamptz: DataTypes.timeStampZ,
  timestamp: DataTypes.timeStamp,
  time: DataTypes.time,
};

module.exports = {
  Aliases,
  DataTypes,
  TypePlaceholders,
};
