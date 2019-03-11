/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const COLUMNS_ATTRS = [ 'name', 'nullable', 'default', 'type', 'collate' ]
const COLUMN_CONSTRAINTS = [ 'unique', 'primaryKey', 'references' ]
const ALL_PROPERTIES = [ ...COLUMNS_ATTRS, ...COLUMN_CONSTRAINTS, 'previousNames', 'force' ]

const DEFAULTS = {
  nullable: true,
  default: null,
  force: false,
  collate: null,
  previousNames: null,
}

module.exports = {
  DEFAULTS,
  ATTRS: COLUMNS_ATTRS,
  CONSTRAINTS: COLUMN_CONSTRAINTS,
  ALL_PROPERTIES,
}
