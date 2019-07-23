/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const R = require('ramda')

const parser = require('../parser')
const queries = require('../queries/sequence')

/**
 * @typedef {object} SequenceInfo
 * @property {function} getProperties
 */

/**
 *
 * @param {object} options
 * @returns {SequenceInfo}
 */

function SequenceInfo (options) {
  const { client, schema, name } = options

  const getProperties = async () => (
    client.query(
      queries.getSequence(schema, name),
    ).then(R.path([ 'rows', 0 ])).then(parser.dbSequence)
  )

  return Object.freeze({
    getProperties
  })
}

module.exports = SequenceInfo
