/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

class Logger {
  constructor(options = {}) {
    const { logging = true, callback = console.info } = options;
    this._callback = callback;
    this._logging = logging;
  }

  info(message) {
    this._logging && this._callback(`Postgres Differ > ${message}`);
  }

  log(message) {
    this._logging && this._callback(message);
  }
}

module.exports = Logger;
