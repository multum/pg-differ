/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const R = require('ramda')
const parser = require('../parser')
const Sql = require('../sql')
const queries = require('../queries/sequence')
const validate = require('../validate')

const { DEFAULTS, ATTRIBUTES } = require('../constants/sequences')

/**
 * @typedef {object} Sequence
 * @property {function} _getSqlChanges
 * @property {function} _getSqlIncrement
 */

/**
 *
 * @param {object} options
 * @returns {Sequence}
 */
module.exports = function (options) {
  let {
    properties,
    client,
  } = options

  properties = validate.sequence({ ...DEFAULTS, ...properties })

  const [ schema = 'public', name ] = parser.separateSchema(properties.name)

  const _fetchStructure = () => (
    client.query(
      queries.getSequence(schema, name),
    ).then(R.path([ 'rows', 0 ])).then(parser.dbSequence)
  )

  const _buildSql = ({ action, ...rest }) => {
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
      const sql = [ `${action} sequence ${schema}.${name}`, ...chunks ].join(' ') + ';'
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

  const _getSqlChanges = async () => {
    if (properties.force) {
      return new Sql([
        Sql.create('drop sequence', `drop sequence if exists ${schema}.${name} cascade;`),
        ..._buildSql({ action: 'create', ...properties }).getStore(),
      ])
    } else {
      const dbStructure = await _fetchStructure()
      const options = dbStructure
        ? { action: 'alter', ..._getDifference(properties, dbStructure) }
        : { action: 'create', ...properties }
      return _buildSql(options)
    }
  }

  const _getProperties = () => ({ ...properties })

  const _getSqlIncrement = () => `nextval('${schema}.${name}'::regclass)`

  return Object.freeze({ _getSqlChanges, _getSqlIncrement, _getProperties })
}
