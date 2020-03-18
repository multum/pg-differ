/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const R = require('ramda');
const ChangeStorage = require('../../change-storage');
const AbstractObject = require('../abstract');
const QueryGenerator = require('./query-generator');
const SequenceQueryGenerator = require('../sequence/query-generator');

const utils = require('../../utils');
const helpers = require('../../helpers');
const parser = require('../../parser');

const _getExistingExtensions = structure => {
  return structure
    ? {
        check: structure.checks,
        primaryKey: structure.primaryKey ? [structure.primaryKey] : [],
        foreignKey: structure.foreignKeys,
        index: structure.indexes,
        unique: structure.unique,
      }
    : {};
};

const _getColumnAttributeDiff = (column, receivedColumn) => {
  const diff = utils.getDiff(
    { ...column, type: column.type.raw },
    { ...receivedColumn, type: receivedColumn.type.raw }
  );
  if (diff.name) {
    diff.name = { prev: receivedColumn.name, next: column.name };
  }
  if (diff.type) {
    diff.type = {
      prev: receivedColumn.type,
      next: column.type,
    };
  }
  return diff;
};

class Table extends AbstractObject {
  constructor(differ, properties) {
    super(differ, properties);
    this.type = 'table';

    const { columns, extensions } = parser.schema(this.properties);
    this._columns = columns;
    this._extensions = extensions;

    this._normalizeCheckRows = R.once(this._normalizeCheckRows);
  }

  static willBeCreated(structure, options) {
    return options.force || !structure;
  }

  _getCreateOrAlterTableQueries(structure, options) {
    if (options.force) {
      return this._getCreateTableQueries({ force: true });
    } else {
      if (structure) {
        return this._getColumnChangeQueries(structure);
      } else {
        return this._getCreateTableQueries({ force: false });
      }
    }
  }

  _getColumnChangeQueries(structure) {
    const fullName = this.getQuotedFullName();
    const receivedColumns = structure.columns.map(column => ({
      ...column,
      default: parser.defaultValueInformationSchema(
        column.default,
        this._differ.defaultSchema
      ),
    }));
    const queries = new ChangeStorage();
    this._columns.forEach(column => {
      const receivedColumn = utils.findByName(
        receivedColumns,
        column.name,
        column.formerNames
      );
      const attributes = ['name', 'nullable', 'type', 'default', 'collate'];
      if (receivedColumn) {
        const diff = _getColumnAttributeDiff(
          R.pick(attributes, column),
          R.pick(attributes, receivedColumn)
        );

        if (!column.identity && receivedColumn.identity) {
          queries.add(QueryGenerator.dropIdentify(fullName, column));
        }

        if (!utils.isEmpty(diff)) {
          attributes.forEach(attribute => {
            if (Object.prototype.hasOwnProperty.call(diff, attribute)) {
              const key = attribute;
              const value = diff[key];
              queries.add(
                QueryGenerator.alterColumn(fullName, column, key, value)
              );
            }
          });
        }

        if (column.identity) {
          queries.add(
            receivedColumn.identity
              ? QueryGenerator.alterIdentify(
                  fullName,
                  column,
                  receivedColumn.identity,
                  utils.getDiff(column.identity, receivedColumn.identity)
                )
              : QueryGenerator.addIdentify(fullName, column, column.identity)
          );
        }
      } else {
        queries.add(QueryGenerator.addColumn(fullName, column));
      }
    });
    return queries;
  }

  async _normalizeCheckRows(rows) {
    if (!rows || R.isEmpty(rows)) {
      return rows;
    }

    const getConstraintName = id => `temp_constraint_check_${id}`;
    const tempTableName = `temp_${this.getObjectName()}`;

    const createQueries = this._getCreateTableQueries({
      table: tempTableName,
      temp: true,
      force: false,
    });
    await this._client.query(createQueries.join());
    const queries = rows.reduce(
      (acc, { condition }, i) =>
        acc.add(
          this._addExtension('check', tempTableName, {
            name: getConstraintName(i),
            condition,
          })
        ),
      new ChangeStorage()
    );

    await this._client.query(queries.join());

    const normalizedChecks = await this._client
      .query(QueryGenerator.getChecks(tempTableName))
      .then(({ rows }) => {
        return rows.map(({ name, definition }) => ({
          name,
          condition: parser.checkCondition(definition),
        }));
      });
    await this._client.query(`drop table ${tempTableName};`);
    return rows.map((_, i) => {
      const nameTempConstraint = getConstraintName(i);
      const { condition } = normalizedChecks.find(
        ({ name }) => name === nameTempConstraint
      );
      return { condition };
    });
  }

  _getSchemaExtensions(type) {
    if (type === 'check') {
      return this._normalizeCheckRows(this._extensions.check);
    } else {
      return this._extensions[type];
    }
  }

  _addExtension(type, table, extension) {
    const encodedType = parser.encodeExtensionType(type);
    if (type === 'index') {
      return QueryGenerator.createIndex(encodedType, table, extension);
    }
    return QueryGenerator.createConstraint(encodedType, table, extension);
  }

  _getCreateTableQueries({
    table = this.getQuotedFullName(),
    columns = this._columns,
    temp = false,
    force,
  }) {
    return new ChangeStorage(
      QueryGenerator.createTable(table, columns, force, temp)
    );
  }

  async _getIdentityActualizeQueries(structure, options) {
    const fullName = this.getQuotedFullName();
    const queries = new ChangeStorage();
    const willBeCreated = Table.willBeCreated(structure, options);

    const columns = this._columns.filter(({ identity }) => identity);

    if (columns.length === 0 || willBeCreated) {
      return queries;
    }

    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];
      const receivedColumn = utils.findByName(
        structure.columns,
        column.name,
        columns.formerNames
      );

      if (receivedColumn && receivedColumn.identity) {
        const {
          rows: [{ name }],
        } = await this._client.query(
          QueryGenerator.getIdentityColumnSequence(fullName, column)
        );

        const {
          rows: [{ value: curValue }],
        } = await this._client.query(
          SequenceQueryGenerator.getCurrentValue(name)
        );

        const {
          rows: [{ max: valueForRestart }],
        } = await this._client.query(
          QueryGenerator.getMaxValueForRestartSequence(
            fullName,
            column.name,
            column.identity.min,
            column.identity.max,
            curValue
          )
        );

        if (utils.isExist(valueForRestart)) {
          queries.add(
            QueryGenerator.restartIdentity(fullName, column, valueForRestart)
          );
        }
      }
    }
    return queries;
  }

  async _getExtensionCleanupQueries(type, structure, options) {
    const fullName = this.getQuotedFullName();
    const quotedSchema = helpers.quoteIdentifier(this.getSchemaName());

    const queries = new ChangeStorage();
    const willBeCreated = Table.willBeCreated(structure, options);

    if (options.cleanable[type] !== true || willBeCreated) {
      return queries;
    }

    const existingExtensions = _getExistingExtensions(structure)[type];
    const schemaExtensions = await this._getSchemaExtensions(type);

    existingExtensions.forEach(({ name, ...props }) => {
      name = helpers.quoteIdentifier(name);
      if (!utils.findWhere(props, schemaExtensions)) {
        queries.add(
          type === 'index'
            ? QueryGenerator.removeIndex(quotedSchema, name)
            : QueryGenerator.removeConstraint(fullName, name)
        );
      }
    });

    return queries;
  }

  async _getAddExtensionQueries(type, structure, options) {
    const fullName = this.getQuotedFullName();
    const queries = new ChangeStorage();

    const willBeCreated = Table.willBeCreated(structure, options);
    const existingExtensions = _getExistingExtensions(structure)[type];
    const schemaExtensions = await this._getSchemaExtensions(type);

    if (!schemaExtensions) {
      return queries;
    }

    schemaExtensions.forEach(extension => {
      if (willBeCreated || !utils.findWhere(extension, existingExtensions)) {
        queries.add(this._addExtension(type, fullName, extension));
      }
    });

    return queries;
  }
}

module.exports = Table;
