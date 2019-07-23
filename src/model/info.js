/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const R = require('ramda')

const queries = require('../queries/model')
const parser = require('../parser')

/**
 * @typedef {object} ModelInfo
 * @property {function} getColumns
 * @property {function} getConstraints
 * @property {function} getIndexes
 */

/**
 *
 * @param {object} options
 * @returns {ModelInfo}
 */

function ModelInfo (options) {
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

  const getConstraints = async (s = schema, table = name) => {
    await client.query('savepoint temp_search_path')
    await client.query(queries.publicSearchPath())
    const constraints = await client.query(
      queries.getConstraints(s, table),
    ).then(
      R.pipe(
        R.prop('rows'),
        parser.extensionDefinitions,
        R.groupBy(R.prop('type')),
      ),
    )
    await client.query('rollback to savepoint temp_search_path')
    return constraints
  }

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

  return Object.freeze({
    getColumns,
    getConstraints,
    getIndexes,
  })
}

module.exports = ModelInfo
