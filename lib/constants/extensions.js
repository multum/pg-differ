/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

exports.FOREIGN_KEY_DEFAULTS = {
  onUpdate: 'NO ACTION',
  onDelete: 'NO ACTION',
  match: 'SIMPLE',
};

exports.TYPES = {
  PRIMARY_KEY: 'PRIMARY KEY',
  UNIQUE: 'UNIQUE',
  FOREIGN_KEY: 'FOREIGN KEY',
  INDEX: 'INDEX',
  CHECK: 'CHECK',
};
