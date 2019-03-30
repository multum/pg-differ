/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const R = require('ramda')
const utils = require('./utils')
const chalk = require('chalk')

/**
 *
 * @param prefix {string}
 * @param callback {function}
 */
module.exports = function ({ prefix, callback }) {
  const getTitle = (string) => `----- ${prefix}: ${string} -----`

  const log = R.curry((type, title, message) => {
    if (callback) {
      const string = [ title && getTitle(title), message ].filter(utils.isExist).join('\n')
      switch (type) {
        case 'warn':
          callback(chalk.yellow(string))
          break
        case 'error':
          callback(chalk.red(string))
          break
        default:
          callback(string)
      }
    }
    return null
  })

  return {
    log,
    info: log('info'),
    warn: log('warn', 'Warning'),
    error: log('error', 'Error'),
  }
}
