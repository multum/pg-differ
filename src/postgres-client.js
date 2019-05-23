/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Client } = require('pg')

/**
 * @typedef {Object} PostgresClient
 * @property {function} end
 * @property {function} query
 */

/**
 *
 * @param connectionConfig
 * @param options
 * @returns {PostgresClient}
 */
module.exports = function (connectionConfig, { reconnection }) {
  let client

  const connect = (attempt = 0) => {
    client = new Client(connectionConfig)
    return _connect(attempt)
  }

  const _connect = (attempt) => client
    .connect()
    .catch((error) => {
      if (reconnection && attempt < reconnection.attempts) {
        console.error(error.message)
        return retry(attempt)
      } else {
        throw error
      }
    })

  const retry = async (attempt) => {
    console.info(`Reconnection attempt [ ${attempt += 1} ] will be in ${reconnection.delay} seconds.`)
    await end()
    return new Promise((resolve) => {
      setTimeout(() => resolve(connect(attempt)), reconnection.delay)
    })
  }

  const end = async () => {
    client && await client.end()
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
