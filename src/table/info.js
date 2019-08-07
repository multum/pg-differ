/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const R = require('ramda')

const queries = require('./queries')
const parser = require('../parser')

/**
 * @typedef {object} TableInfo
 * @property {function} getColumns
 * @property {function} getConstraints
 * @property {function} getIndexes
 * @property {function} getRows
 * @property {function} exists
 */

/**
 *
 * @param {object} options
 * @param {PostgresClient} options.client
 * @param {string} options.schema
 * @param {string} options.name
 * @returns {TableInfo}
 */

function TableInfo (options) {
  const { client, schema, name } = options

  const getColumns = async () => (
    client.query(
      queries.getColumns(schema, name),
    ).then(
      R.pipe(
        R.prop('rows'),
        parser.dbColumns(schema),
      ),
    )
  )

  const getConstraints = (s = schema, table = name) => (
    client.query(
      queries.getConstraints(s, table),
    ).then(
      R.pipe(
        // `1` is the result of executing sql-query to get constraints
        R.path([ 1, 'rows' ]),
        parser.extensionDefinitions,
        R.groupBy(R.prop('type')),
      ),
    )
  )

  const getIndexes = () => (
    client.query(
      queries.getIndexes(schema, name),
    ).then(
      R.pipe(
        R.prop('rows'),
        parser.indexDefinitions,
      ),
    )
  )

  const getRows = (orderBy, range) => (
    client.query(
      queries.getRows(schema, name, orderBy, range),
    ).then(
      R.pipe(
        R.prop('rows'),
      ),
    )
  )

  const exists = () => (
    client.query(
      queries.tableExist(schema, name),
    ).then(R.path([ 'rows', 0, 'exists' ]))
  )

  return Object.freeze({
    getColumns,
    getConstraints,
    getIndexes,
    getRows,
    exists,
  })
}

module.exports = TableInfo
