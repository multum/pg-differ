/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

module.exports = {
  // table
  CREATE_TABLE: 'create table',
  DROP_TABLE: 'drop table',

  CREATE_INDEX: 'create index',
  DROP_INDEX: 'drop index',

  ADD_PRIMARY_KEY: 'add primaryKey',
  DROP_PRIMARY_KEY: 'drop primaryKey',

  ADD_FOREIGN_KEY: 'add foreignKey',
  DROP_FOREIGN_KEY: 'drop foreignKey',

  ADD_UNIQUE: 'add unique',
  DROP_UNIQUE: 'drop unique',

  ADD_CHECK: 'add check',
  DROP_CHECK: 'drop check',

  ADD_COLUMN: 'add column',
  RENAME_COLUMN: 'rename column',

  SET_NOT_NULL: 'set not null',
  DROP_NOT_NULL: 'drop not null',

  SET_VALUES_BY_DEFAULTS: 'set values by defaults',

  TYPE_CHANGE: 'type change',

  DROP_AND_ADD_COLUMN: 'drop and add column',

  SET_DEFAULT: 'set default',
  DROP_DEFAULT: 'drop default',

  INSERT_SEED: 'insert seed',

  // sequence
  CREATE_SEQUENCE: 'create sequence',
  ALTER_SEQUENCE: 'alter sequence',
  DROP_SEQUENCE: 'drop sequence',
  SEQUENCE_RESTART: 'sequence restart',
};
