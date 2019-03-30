/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Client } = require('pg')
const _timeoutRetry = 5 // seconds

/**
 * @typedef {Object} PostgresClient
 * @property {function} end
 * @property {function} query
 */

/**
 *
 * @param options
 * @returns {PostgresClient}
 */
module.exports = function (options) {
  let client

  const connect = () => {
    client = new Client(options)
    return _connect()
  }

  const _connect = () => client.connect().catch(retry)

  const retry = (error) => {
    console.error(error)
    console.info(`Reconnection will be in ${_timeoutRetry} seconds.`)
    return new Promise((resolve) => {
      setTimeout(() => resolve(_connect()), _timeoutRetry * 1000)
    })
  }

  const end = () => {
    client && client.end()
    client = null
  }

  const query = async (sql, params = []) => {
    !client && await connect()
    return client.query(sql, params)
  }

  return Object.freeze({
    end,
    query,
  })
}
