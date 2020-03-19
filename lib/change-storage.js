/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const R = require('ramda');

class ChangeStorage {
  constructor(query) {
    this._querySet = new Set();
    query && this.add(query);
  }

  add(query) {
    if (R.is(Array, query)) {
      query.forEach(query => this.add(query));
    } else if (typeof query === 'string') {
      this._querySet.add(query);
    }
    return this;
  }

  values() {
    return [...this._querySet];
  }

  join(separator = '\n') {
    return this.values().join(separator);
  }

  // size() {
  //   return this._querySet.size;
  // }
}

module.exports = ChangeStorage;
