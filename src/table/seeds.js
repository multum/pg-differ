/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const parser = require('../parser');

module.exports = function(options) {
  const { table } = options;
  let _seeds = [];

  const add = seeds => {
    _seeds = _seeds.concat(seeds);
  };

  const inserts = () => _seeds.map(_insertSeed);

  const _insertSeed = seed => {
    const keys = Object.keys(seed).join(', ');
    const values = Object.values(seed)
      .map(parser.encodeValue)
      .join(', ');
    return `insert into ${table} (${keys}) values (${values}) on conflict do nothing;`;
  };

  const size = () => _seeds.length;

  const _instance = { add, inserts, size };

  return Object.freeze(_instance);
};
