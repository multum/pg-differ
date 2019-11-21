/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const R = require('ramda');
const Metalize = require('metalize');
const utils = require('./utils');
const validate = require('./validate');

const Logger = require('./logger');
const Client = require('./postgres-client');
const Table = require('./table');
const Sequence = require('./sequence');

const { PROCESSES, OPERATIONS } = require('./constants');

const _defaultOptions = {
  logging: false,
  schemaFolder: null,
  connectionConfig: null,
  force: false,
  reconnection: { attempts: Infinity, delay: 5000 },
};

const _defaultSyncOptions = {
  transaction: true,
};

const _readSchemas = ({
  path: pathString,
  locals,
  filter = /.*\.schema.json$/,
  interpolate = /\${([\s\S]+?)}/g,
}) =>
  fs
    .readdirSync(pathString)
    .filter(file => filter.test(file))
    .map(file =>
      utils.loadJSON(path.resolve(pathString, file), locals, interpolate)
    );

const _calculateSuccessfulInsets = R.ifElse(
  R.is(Array),
  R.reduce((acc, insert) => acc + insert.rowCount, 0),
  R.prop('rowCount')
);

function Differ(options) {
  options = { ..._defaultOptions, ...options };
  const { schemaFolder, placeholders, connectionConfig } = options;

  let reconnection;
  let logging;

  if (options.reconnection) {
    if (typeof options.reconnection === 'boolean') {
      reconnection = _defaultOptions.reconnection;
    } else {
      reconnection = {
        ..._defaultOptions.reconnection,
        ...options.reconnection,
      };
    }
  } else {
    reconnection = false;
  }

  if (options.logging) {
    if (typeof options.logging === 'function') {
      logging = options.logging;
    } else {
      logging = console.info;
    }
  } else {
    logging = false;
  }

  const log = new Logger({ prefix: null, callback: logging });

  /**
   * @todo CLI: `options.force` => `differ.sync({ force })`
   * @body Need to be replaced with the `force` option in the `differ.sync()` method
   */
  if (options.force) {
    log.warn(
      `The property 'options.force' is deprecated.` +
        ` Use 'define.table({...properties, force: true})' or 'define.sequence({...properties, force: true})'`
    );
  }

  const _client = new Client(connectionConfig, { reconnection });
  const _tables = new Map();
  const _sequences = new Map();

  const _getDatabaseVersion = async () => {
    const {
      rows: [row],
    } = await _client.query('select version()');
    const version = row.version.match(/[0-9]+.[0-9]+/);
    return version ? Number(version[0]) : null;
  };

  const _setup = () => {
    if (schemaFolder) {
      _import({ path: schemaFolder, locals: placeholders });
    }
  };

  const _import = options => {
    if (typeof options === 'string') {
      options = { path: options };
    }
    let schemas;
    try {
      schemas = _readSchemas(options);
    } catch (error) {
      throw new Error(log.error(error.message));
    }
    return new Map(
      schemas.map(schema => [schema.properties.name, _define(schema)])
    );
  };

  const _supportSeeds = async v => {
    const version = utils.isExist(v) ? v : await _getDatabaseVersion();
    return version >= 9.5;
  };

  const _define = (type, properties) => {
    if (typeof type === 'object') {
      properties = type.properties;
      type = type.type;
    }

    switch (type) {
      case 'table': {
        const table = new Table({
          client: _client,
          schema: properties,
          force: options.force,
          logging,
        });
        _tables.set(properties.name, table);

        table._getSequences().forEach(([, sequence]) => {
          _sequences.set(sequence._name, sequence);
        });

        return table;
      }
      case 'sequence': {
        const sequence = new Sequence({
          force: options.force,
          properties,
          client: _client,
        });
        _sequences.set(properties.name, sequence);
        return sequence;
      }
      default:
        throw new Error(log.error(`Invalid schema type: ${type}`));
    }
  };

  const _getFlatAndSortedSqlList = async (orderOfOperations, promises) => {
    const result = await Promise.all(promises);
    let store = result.filter(Boolean).map(sql => sql.getStore());

    store = R.unnest(store);

    if (orderOfOperations) {
      store = utils.sortByList(sql => sql.operation, orderOfOperations, store);
    }

    return store.map(sql => sql.value);
  };

  const _sync = async ({
    process,
    orderOfOperations,
    promises,
    logging = true,
  }) => {
    let sql = await _getFlatAndSortedSqlList(orderOfOperations, promises);
    if (R.isEmpty(sql)) {
      return null;
    } else {
      sql = R.uniq(sql);
      const result = [];
      process = `[ ${chalk.green(process)} ]`;
      logging && log.info(`${process} started` + '\n' + sql.join('\n'));
      for (let i = 0; i < sql.length; i++) {
        result.push(await _client.query(sql[i]));
      }
      logging && log.info(`${process} successfully`);
      return result;
    }
  };

  const sync = async options => {
    options = { ..._defaultSyncOptions, ...options };

    const tables = [..._tables.values()];
    const sequences = [..._sequences.values()];

    const metalize = new Metalize({ client: _client, dialect: 'postgres' });

    const tableStructures = await metalize.read.tables(
      tables.map(t => t._name)
    );
    const sequenceStructures = await metalize.read.sequences(
      sequences.map(s => s._name)
    );

    const databaseVersion = await _getDatabaseVersion();

    log.info(chalk.green('Sync started'));
    log.info(chalk.green(`Current version PostgreSQL: ${databaseVersion}`));

    options.transaction && (await _client.query('begin'));

    try {
      const queries = [
        await _sync({
          process: PROCESSES.UPDATING_SEQUENCES,
          promises: sequences.map(sequence =>
            sequence._getSqlChanges(sequenceStructures)
          ),
        }),
        await _sync({
          process: PROCESSES.CLEANING_EXTENSIONS,
          orderOfOperations: [
            OPERATIONS.DROP_FOREIGN_KEY,
            OPERATIONS.DROP_PRIMARY_KEY,
            OPERATIONS.DROP_UNIQUE,
          ],
          promises: tables.map(table =>
            table._getSqlCleaningExtensions(tableStructures)
          ),
        }),
        await _sync({
          process: PROCESSES.UPDATING_TABLES,
          orderOfOperations: [
            OPERATIONS.RENAME_COLUMN,
            OPERATIONS.DROP_NOT_NULL,
            OPERATIONS.DROP_DEFAULT,
            OPERATIONS.TYPE_CHANGE,
            OPERATIONS.SET_DEFAULT,
          ],
          promises: tables.map(table =>
            table._getSqlCreateOrAlterTable(tableStructures)
          ),
        }),
        await _sync({
          process: PROCESSES.ADDING_EXTENSIONS,
          orderOfOperations: [
            OPERATIONS.ADD_UNIQUE,
            OPERATIONS.ADD_PRIMARY_KEY,
          ],
          promises: tables.map(table =>
            table._getSqlAddingExtensions(tableStructures)
          ),
        }),
      ];

      let insertSeedCount = 0;
      if (await _supportSeeds(databaseVersion)) {
        const insertSeedQueries = await _sync({
          process: PROCESSES.INSERTING_SEEDS,
          promises: tables.map(table => table._getSqlInsertSeeds()),
          logging: false,
        });
        if (insertSeedQueries) {
          insertSeedCount = _calculateSuccessfulInsets(insertSeedQueries);
          log.info(
            `inserted ${chalk.green('seeds')}: ${chalk.green(insertSeedCount)}`
          );
          queries.push(insertSeedCount);
        }
      } else {
        log.warn(`For Seeds need a PostgreSQL v9.5 or more`);
      }

      queries.push(
        await _sync({
          process: PROCESSES.UPDATING_SEQUENCE_VALUES,
          promises: tables.map(table =>
            table._getSqlSequenceActualize(tableStructures)
          ),
        })
      );

      if (queries.filter(Boolean).length === 0) {
        log.info('Database does not need updating');
      }

      options.transaction && (await _client.query('commit'));
      log.info(chalk.green('Sync successful!'));

      await _client.end();
    } catch (error) {
      options.transaction && (await _client.query('rollback'));
      await _client.end();
      throw error;
    }
  };

  const _read = async (type, options) => {
    let properties;
    try {
      switch (type) {
        case 'table': {
          validate.tableReading(options);
          properties = await Table._read(_client, options);
          break;
        }
        case 'sequence': {
          validate.sequenceReading(options);
          properties = await Sequence._read(_client, options);
          break;
        }
      }
      await _client.end();
      return properties;
    } catch (error) {
      await _client.end();
      throw error;
    }
  };

  const read = {
    table: options => _read('table', options),
    sequence: options => _read('sequence', options),
  };

  const define = (type, properties) => {
    log.warn(
      `The method 'define(type, properties)' is deprecated.` +
        ` Use 'define.table(properties)' or 'define.sequence(properties)'`
    );
    return _define(type, properties);
  };

  define.table = properties => _define('table', properties);

  define.sequence = properties => _define('sequence', properties);

  const _instance = {
    // private
    _supportSeeds,
    _getDatabaseVersion,
    _client,
    // public
    import: _import,
    sync,
    define,
    read,
  };

  _setup();

  return Object.freeze(_instance);
}

module.exports = Differ;
