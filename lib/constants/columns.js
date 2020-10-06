/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const Sequences = require('./sequences');

const getDefaults = () => {
  return {
    nullable: true,
    default: null,
    collate: null,
    formerNames: null,
    identity: false,
  };
};

const getIdentityDefaults = (type) => {
  const defaults = Sequences.getDefaults(type);
  defaults.generation = 'BY DEFAULT';
  return defaults;
};

module.exports = {
  getDefaults,
  getIdentityDefaults,
};
