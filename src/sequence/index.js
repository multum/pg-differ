/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const R = require('ramda');
const Metalize = require('metalize');
const parser = require('../parser');
const Sql = require('../sql');
const Logger = require('../logger');
const utils = require('../utils');
const queries = require('./queries');
const validate = require('../validate');

const { OPERATIONS } = require('../constants');
const { DEFAULTS, ATTRIBUTES } = require('../constants/sequences');

function Sequence(options) {
  let { properties, client, force } = options;
  properties = { ...DEFAULTS, ...properties };

  const [schema = 'public', name] = parser.name(properties.name);
  const _fullName = `${schema}.${name}`;

  const log = new Logger({
    prefix: `[ '${_fullName}' ]`,
    callback: options.logging,
  });

  try {
    validate.sequenceDefinition(properties);
  } catch (error) {
    throw new Error(log.error(error.message));
  }

  const _forceCreate = R.isNil(properties.force) ? force : properties.force;

  const _buildSql = ({ operation, ...rest }) => {
    const chunks = [];
    Object.entries(rest).forEach(([key, value]) => {
      switch (key) {
        case 'start':
          value ? chunks.push(`start ${value}`) : chunks.push('no start');
          break;
        case 'increment':
          value
            ? chunks.push(`increment ${value}`)
            : chunks.push(`increment ${DEFAULTS.increment}`);
          break;
        case 'min':
          value ? chunks.push(`minvalue ${value}`) : chunks.push('no minvalue');
          break;
        case 'max':
          value ? chunks.push(`maxvalue ${value}`) : chunks.push('no maxvalue');
          break;
        case 'cycle':
          value ? chunks.push('cycle') : chunks.push('no cycle');
          break;
        case 'current':
          utils.isExist(value) && chunks.push(`restart with ${value}`);
          break;
        default:
          break;
      }
    });

    if (chunks.length) {
      chunks.unshift(`${operation} ${_fullName}`);
      return new Sql(Sql.create(operation, chunks.join(' ') + ';'));
    }

    return null;
  };

  const _getDifference = (a, b) =>
    ATTRIBUTES.reduce((acc, key) => {
      const leftValue = a[key];
      const rightValue = b[key];
      if (String(leftValue) !== String(rightValue)) {
        acc[key] = leftValue;
      }
      return acc;
    }, {});

  const _getSqlChanges = async structures => {
    if (_forceCreate) {
      return new Sql([
        Sql.create(
          OPERATIONS.DROP_SEQUENCE,
          `drop sequence if exists ${_fullName} cascade;`
        ),
        ..._buildSql({
          operation: OPERATIONS.CREATE_SEQUENCE,
          ...properties,
        }).getStore(),
      ]);
    } else {
      const structure = structures.get(_fullName);
      if (structure) {
        const diff = _getDifference(properties, structure);
        if (utils.isExist(diff.min) || utils.isExist(diff.max)) {
          const {
            rows: [{ correct }],
          } = await client.query(
            queries.hasCorrectCurrValue(
              _fullName,
              properties.min,
              properties.max
            )
          );
          if (!correct) {
            diff.current = properties.min;
          }
        }
        return _buildSql({ operation: OPERATIONS.ALTER_SEQUENCE, ...diff });
      } else {
        return _buildSql({
          operation: OPERATIONS.CREATE_SEQUENCE,
          ...properties,
        });
      }
    }
  };

  const _getProperties = () => properties;

  const _getQueryIncrement = () => queries.increment(_fullName);

  const _getQueryRestart = value => queries.restart(_fullName, value);

  const _getCurrentValue = async () => {
    const {
      rows: [{ currentValue }],
    } = await client.query(queries.getCurrentValue(_fullName));
    return currentValue;
  };

  const _instance = {
    _getSqlChanges,
    _getQueryIncrement,
    _getProperties,
    _getQueryRestart,
    _getCurrentValue,
    _name: _fullName,
  };

  return Object.freeze(_instance);
}

Sequence._read = async (client, options) => {
  const metalize = new Metalize({ client, dialect: 'postgres' });

  const [_schemaName = 'public', _sequenceName] = parser.name(options.name);
  const fullName = `${_schemaName}.${_sequenceName}`;

  const structures = await metalize.read.sequences([fullName]);
  return structures.get(fullName);
};

module.exports = Sequence;
