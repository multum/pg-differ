const { Client } = require('pg')

/**
 * @typedef {Object} PostgresClient
 * @property {function} find
 * @property {function} findOne
 * @property {function} end
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
    setTimeout(_connect, 10 * 1000)
  }

  const end = () => {
    client && client.end()
    client = null
  }

  const query = async (sql, params = [], queryOptions = options) => {
    const { reconnecting } = queryOptions
    !client && await connect()
    const result = await client.query(sql, params)
    if (reconnecting) {
      end()
    }
    return result
  }

  const find = (sql, params = [], options) =>
    query(sql, params, options).then((result) => result.rows)

  const findOne = (sql, params = [], options) =>
    query(sql, params, options).then((result) => result.rows[0])

  return Object.freeze({
    find,
    findOne,
    end,
    query,
  })
}
