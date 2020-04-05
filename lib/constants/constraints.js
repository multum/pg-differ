/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

exports.ForeignKeyDefaults = {
  onUpdate: 'NO ACTION',
  onDelete: 'NO ACTION',
  match: 'SIMPLE',
};

exports.Types = {
  PRIMARY_KEY: 'primary key',
  UNIQUE: 'unique',
  FOREIGN_KEY: 'foreign key',
  CHECK: 'check',
};
