/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

exports.FOREIGN_KEY_DEFAULTS = {
  onUpdate: 'NO ACTION',
  onDelete: 'NO ACTION',
  match: 'SIMPLE',
}

exports.TYPES = {
  PRIMARY_KEY: 'PRIMARY KEY',
  UNIQUE: 'UNIQUE',
  FOREIGN_KEY: 'FOREIGN KEY',
  INDEX: 'INDEX',
  CHECK: 'CHECK',
}

exports.ORDER_OF_OPERATIONS = [
  'drop foreignKey',
  'drop primaryKey',
  'drop unique',
  'delete rows',
  'add unique',
]