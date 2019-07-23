/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const parser = require('../parser')
const Sql = require('../sql')
const Info = require('./info')
const utils = require('../utils')
const queries = require('../queries/sequence')
const validate = require('../validate')

const { DEFAULTS, ATTRIBUTES } = require('../constants/sequences')

/**
 * @typedef {object} Sequence
 * @property {function} _getSqlChanges
 * @property {function} _getQueryIncrement
 * @property {function} _getQueryRestart
 * @property {function} _getCurrentValue
 */

/**
 *
 * @param {object} options
 * @returns {Sequence}
 */
function Sequence (options) {
  let {
    properties,
    client,
  } = options

  properties = validate.sequence({ ...DEFAULTS, ...properties })
  const [ schema = 'public', name ] = parser.separateSchema(properties.name)

  const info = new Info({ client, schema, name })

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
        case 'current':
          utils.isExist(value) && chunks.push(`restart with ${value}`)
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
      const dbStructure = await info.getProperties()
      if (dbStructure) {
        const diff = _getDifference(properties, dbStructure)
        if (utils.isExist(diff.min) || utils.isExist(diff.max)) {
          const { rows: [ { correct } ] } = await client.query(
            queries.hasCorrectCurrValue(schema, name, properties.min, properties.max),
          )
          if (!correct) {
            diff.current = properties.min
          }
        }
        return _buildSql({ action: 'alter', ...diff })
      } else {
        return _buildSql({ action: 'create', ...properties })
      }
    }
  }

  const _getProperties = () => ({ ...properties })

  const _getQueryIncrement = () => queries.increment(schema, name)

  const _getQueryRestart = (value) => queries.restart(schema, name, value)

  const _getCurrentValue = async () => {
    const { rows: [ { currentValue } ] } = await client.query(
      queries.getCurrentValue(schema, name),
    )
    return currentValue
  }

  return Object.freeze({
    _getSqlChanges,
    _getQueryIncrement,
    _getProperties,
    _getQueryRestart,
    _getCurrentValue,
  })
}

Sequence._read = async (name, options) => {
  const { client } = options
  const [ _schemaName = 'public', _sequenceName ] = parser.separateSchema(name)
  const info = new Info({ client, schema: _schemaName, name: _sequenceName })

  return {
    type: 'sequence',
    properties: {
      ...await info.getProperties(),
      name: `${_schemaName}.${_sequenceName}`,
    },
  }
}

module.exports = Sequence
