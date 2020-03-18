/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const chalk = require('chalk');
const R = require('ramda');
const utils = require('./utils');
const helpers = require('./helpers');
const parser = require('./parser');
const path = require('path');
const validate = require('./validate');
const errors = require('./errors');

const Metalize = require('metalize');

const Logger = require('./logger');
const ConnectionManager = require('./connection-manager');

const Table = require('./objects/table');
const Sequence = require('./objects/sequence');

const _defaultOptions = {
  logging: false,
  connectionConfig: null,
  reconnection: { attempts: 10, delay: 5000 },
};

class Differ {
  constructor(options) {
    options = { ..._defaultOptions, ...options };
    this.defaultSchema = 'public';
    let reconnection;

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

    let loggingCallback;
    if (options.logging && typeof options.logging === 'function') {
      loggingCallback = options.logging;
    }

    this._logger = new Logger({
      prefix: null,
      logging: options.logging,
      callback: loggingCallback,
    });

    this._client = new ConnectionManager(options.connectionConfig, {
      reconnection,
      logger: this._logger,
    });
    this.objects = new Map();
  }

  async _getDatabaseVersion() {
    const {
      rows: [row],
    } = await this._client.query('select version()');
    const version = R.match(/[0-9]+.[0-9]+/, row.version)[0];
    return Number(version);
  }

  setDefaultSchema(schema) {
    this.defaultSchema = schema;
    return this;
  }

  import(options) {
    if (typeof options === 'string') {
      options = { path: options };
    } else {
      options = { ...options };
    }
    // is it a relative path?
    if (path.normalize(options.path) !== path.resolve(options.path)) {
      // make path relative to the caller
      const callerFilename = utils.getCaller();
      const callerPath = path.dirname(callerFilename);
      options.path = path.resolve(callerPath, options.path);
    }

    const schemas = helpers.readSchemas(options);

    return new Map(
      schemas.map(schema => [
        schema.properties.name,
        this.define(schema.type, schema.properties),
      ])
    );
  }

  _createObject(type, properties) {
    let Controller;
    switch (type) {
      case 'table': {
        Controller = Table;
        break;
      }
      case 'sequence': {
        Controller = Sequence;
        break;
      }
      default:
        throw new errors.ValidationError({
          path: 'type',
          message: `should be one of ['table', 'sequence']`,
        });
    }
    validate[type](properties);
    return new Controller(this, properties);
  }

  define(type, properties) {
    const object = this._createObject(type, properties);
    this.objects.set(properties.name, object);
    return object;
  }

  async _prepare(options) {
    const values = [...this.objects.values()];

    const objects = {
      tables: values.filter(object => object.type === 'table'),
      sequences: values.filter(object => object.type === 'sequence'),
    };

    const metalize = new Metalize({
      client: this._client,
      dialect: 'postgres',
    });

    const metadata = await metalize.read({
      tables: objects.tables.map(t => t.getFullName()),
      sequences: objects.sequences.map(s => s.getFullName()),
    });

    const queries = [];

    for (const sequence of objects.sequences) {
      const structure = metadata.sequences.get(sequence.getFullName());
      queries.push(sequence._getChangeQueries(structure, options));
    }

    for (const extType of [
      'foreignKey',
      'primaryKey',
      'unique',
      'check',
      'index',
    ]) {
      for (const table of objects.tables) {
        const structure = metadata.tables.get(table.getFullName());
        queries.push(
          table._getExtensionCleanupQueries(extType, structure, options)
        );
      }
    }
    for (const table of objects.tables) {
      const structure = metadata.tables.get(table.getFullName());
      queries.push(table._getCreateOrAlterTableQueries(structure, options));
    }

    for (const extType of [
      'index',
      'check',
      'unique',
      'primaryKey',
      'foreignKey',
    ]) {
      for (const table of objects.tables) {
        const structure = metadata.tables.get(table.getFullName());
        queries.push(
          table._getAddExtensionQueries(extType, structure, options)
        );
      }
    }

    if (options.actualizeIdentityColumns) {
      for (const table of objects.tables) {
        const structure = metadata.tables.get(table.getFullName());
        queries.push(table._getIdentityActualizeQueries(structure, options));
      }
    }

    return Promise.all(queries).then(
      R.pipe(
        R.map(i => i.values()),
        R.unnest
      )
    );
  }

  async _execute(queries) {
    const results = [];
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      this._logger.log(query);
      results.push(await this._client.query(query));
    }
    return results;
  }

  _end() {
    return this._client.end();
  }

  async sync(options) {
    options = parser.syncOptions(options);

    const databaseVersion = await this._getDatabaseVersion();

    this._logger.info(chalk.green('Sync started'));
    this._logger.info(
      chalk.green(`Current version PostgreSQL: ${databaseVersion}`)
    );

    const preparedChanges = await this._client.transaction(
      () => this._prepare(options),
      options.transaction
    );
    if (preparedChanges.length === 0) {
      this._logger.info('Database does not need updating');
    } else {
      await this._client.transaction(
        () => this._execute(preparedChanges),
        options.transaction
      );
    }

    this._logger.info(chalk.green('Sync successful!'));

    await this._end();

    return preparedChanges;
  }
}

Differ.Error = errors.BaseError;

for (const error of Object.keys(errors)) {
  Differ[error] = errors[error];
}

module.exports = Differ;
