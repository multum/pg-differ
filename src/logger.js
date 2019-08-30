/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const R = require('ramda')
const chalk = require('chalk')

/**
 *
 * @param prefix {string}
 * @param callback {function}
 */
module.exports = function ({ prefix, callback }) {
  const log = R.curry((type, title, message) => {
    const chunks = title
      ? [ `${prefix} :: ${title}`, message ]
      : [ `${prefix} :: ${message}` ]
    switch (type) {
      case 'warn':
        callback && callback(
          chalk.yellow(chunks.join(' ')),
        )
        break
      case 'error':
        return chunks.join('')
      default:
        callback && callback(
          chunks.join('\n'),
        )
    }
    return null
  })

  return {
    log,
    info: log('info'),
    warn: log('warn', `[ Warning ]`),
    error: log('error', null),
  }
}
