/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const ATTRS = ['name', 'nullable', 'default', 'type', 'collate'];
const EXTENSIONS = ['unique', 'primaryKey'];
const ALL_PROPERTIES = [...ATTRS, ...EXTENSIONS, 'formerNames', 'force', 'autoIncrement'];

const DEFAULTS = {
  nullable: true,
  default: null,
  force: false,
  collate: null,
  formerNames: null,
  autoIncrement: false,
};

module.exports = {
  DEFAULTS,
  ATTRS,
  EXTENSIONS,
  ALL_PROPERTIES,
};
