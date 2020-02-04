/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const chalk = require('chalk');

class Logger {
  constructor(options = {}) {
    const { prefix, logging = true, callback = console.info } = options;
    this._prefix = Logger.moduleName + (prefix ? ` ${prefix}` : '');
    this._callback = callback;
    this._logging = logging;
  }

  formatMessage(message) {
    return `${this._prefix} :: ${message}`;
  }

  info(message) {
    console.info(this.formatMessage(message));
  }

  log(message) {
    this._logging && this._callback(message);
  }

  warn(message) {
    console.warn(chalk.yellow(this.formatMessage(message)));
  }

  error(message) {
    console.error(chalk.red(this.formatMessage(message)));
  }
}

Logger.moduleName = 'Postgres Differ';

module.exports = Logger;
module.exports.logger = new Logger();
