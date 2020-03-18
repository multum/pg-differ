/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const DEFAULTS = {
  nullable: true,
  default: null,
  collate: null,
  formerNames: null,
  identity: false,
};

const IDENTITY_DEFAULTS = {
  generation: 'BY DEFAULT',
};

module.exports = {
  DEFAULTS,
  IDENTITY_DEFAULTS,
};
