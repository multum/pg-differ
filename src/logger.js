/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const chalk = require('chalk');

const MODULE_NAME = 'Postgres Differ';

module.exports = function Logger({ prefix, callback }) {
  prefix = MODULE_NAME + (prefix ? ` ${prefix}` : '');
  const formatMessage = message => `${prefix} :: ${message}`;
  return {
    info: message => callback && callback(formatMessage(message)),
    warn: message => console.warn(chalk.yellow(formatMessage(message))),
    error: message => formatMessage(message),
  };
};
