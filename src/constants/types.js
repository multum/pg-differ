/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const ALIASES = {
  'int8': 'bigint',
  'serial8': 'bigserial',
  'varbit': 'bit varying',
  'bool': 'boolean',
  'char': 'character',
  'varchar': 'character varying',
  'float8': 'double precision',
  'int4': 'integer',
  'int': 'integer',
  'decimal': 'numeric',
  'float4': 'real',
  'int2': 'smallint',
  'serial2': 'smallserial',
  'serial4': 'serial',
  'timetz': 'time with time zone',
  'timestamptz': 'timestamp with time zone',
  'timestamp': 'timestamp without time zone',
  'time': 'time without time zone',
}

const GROUPS = {
  INTEGER: [
    'bigint',
    'double precision',
    'integer',
    'money',
    'numeric',
    'oid',
    'real',
    'regclass',
    'regconfig',
    'regdictionary',
    'regnamespace',
    'regoper',
    'regoperator',
    'regproc',
    'regprocedure',
    'regrole',
    'regtype',
    'smallint',
  ],
  CHARACTER: [
    'character',
    'character varying',
    'name',
    'regclass',
    'text',
  ],
  TIME: [
    'abstime',
    'date',
    'time without time zone',
    'timestamp with time zone',
    'timestamp without time zone',
  ],
}

module.exports = {
  ALIASES,
  GROUPS,
}
