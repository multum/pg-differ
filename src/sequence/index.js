/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const R = require('ramda')
const parser = require('./parser')
const Sql = require('../sql')
const { DEFAULTS, ATTRIBUTES } = require('../constants/sequences')

/**
 * @typedef {object} Sequence
 * @property {function} getChanges
 * @property {function} getSqlIncrement
 */

/**
 *
 * @param {object} options
 * @returns {Sequence}
 */
module.exports = function (options) {
  let {
    name,
    schema,
    sequence,
    client,
  } = options

  sequence = { ...DEFAULTS, ...sequence }
  const _sequenceName = `${name}_sequence`

  const _fetchStructure = () => (
    client.query(
      'select' +
      ' start_value, minimum_value, maximum_value, increment, cycle_option' +
      ' from information_schema.sequences' +
      ` where sequence_schema = '${schema}'` +
      ` and sequence_name = '${_sequenceName}'`,
    ).then(R.path([ 'rows', 0 ])).then(parser.dbSequence)
  )

  const _getSql = ({ action, ...rest }) => {
    const chunks = []
    Object.entries(rest).forEach(([ key, value ]) => {
      switch (key) {
        case 'start':
          value ? chunks.push(`start ${value}`) : chunks.push('no start')
          break
        case 'increment':
          value ? chunks.push(`increment ${value}`) : chunks.push(`increment ${DEFAULTS.increment}`)
          break
        case 'min':
          value ? chunks.push(`minvalue ${value}`) : chunks.push('no minvalue')
          break
        case 'max':
          value ? chunks.push(`maxvalue ${value}`) : chunks.push('no maxvalue')
          break
        case 'cycle':
          value ? chunks.push('cycle') : chunks.push('no cycle')
          break
        default:
          break
      }
    })

    if (chunks.length) {
      const sql = [ `${action} sequence ${schema}.${_sequenceName}`, ...chunks ].join(' ') + ';'
      return new Sql(Sql.create(`${action} sequence`, sql))
    }

    return null
  }

  const _getDifference = (a, b) => (
    ATTRIBUTES.reduce((acc, key) => {
      const leftValue = a[key]
      const rightValue = b[key]
      if (String(leftValue) !== String(rightValue)) {
        acc[key] = leftValue
      }
      return acc
    }, {})
  )

  const getChanges = async () => {
    const dbStructure = await _fetchStructure()
    const options = dbStructure
      ? { action: 'alter', ..._getDifference(sequence, dbStructure) }
      : { action: 'create', ...sequence }
    return _getSql(options)
  }

  const getSqlIncrement = () => `nextval('${schema}.${_sequenceName}'::regclass)`

  return Object.freeze({ getChanges, getSqlIncrement })
}
