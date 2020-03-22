/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const ChangeStorage = require('../../change-storage');
const AbstractObject = require('../abstract');
const QueryGenerator = require('./query-generator');
const SequenceQueryGenerator = require('../sequence/query-generator');

const utils = require('../../utils');
const helpers = require('../../helpers');
const parser = require('../../parser');

const _getReceivedExtensions = (structure) => {
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
    {
      name: column.name,
      type: column.type.raw,
      nullable: column.nullable,
      default: column.default,
      collate: column.collate,
    },
    {
      name: receivedColumn.name,
      type: receivedColumn.type.raw,
      nullable: receivedColumn.nullable,
      default: receivedColumn.default,
      collate: receivedColumn.collate,
    }
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

    this._normalizeCheckRows = utils.once(this._normalizeCheckRows);
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
    const fullName = this.getQuotedObjectName();
    const receivedColumns = structure.columns.map((column) => ({
      ...column,
      type: parser.dataType(column.type),
      default: parser.literalDefaultValue(column.default),
    }));
    const queries = new ChangeStorage();
    this._columns.forEach((column) => {
      const receivedColumn = utils.findByName(
        receivedColumns,
        column.name,
        column.formerNames
      );
      if (receivedColumn) {
        const diff = _getColumnAttributeDiff(column, receivedColumn);

        if (!column.identity && receivedColumn.identity) {
          queries.add(QueryGenerator.dropIdentify(fullName, column));
        }

        if (!utils.isEmpty(diff)) {
          // < ! > this order cannot be changed
          ['name', 'nullable', 'type', 'default', 'collate'].forEach(
            (attribute) => {
              if (Object.prototype.hasOwnProperty.call(diff, attribute)) {
                const key = attribute;
                const value = diff[key];
                queries.add(
                  QueryGenerator.alterColumn(fullName, column, key, value)
                );
              }
            }
          );
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

  async _normalizeCheckRows(client, rows) {
    if (!rows || utils.isEmpty(rows)) {
      return rows;
    }

    const getConstraintName = (id) => `temp_constraint_check_${id}`;
    const tempTableName = `temp_${this._path.name}`;

    const createQueries = this._getCreateTableQueries({
      table: tempTableName,
      temp: true,
      force: false,
    });
    await client.query(createQueries.join());

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
    await client.query(queries.join());

    const normalizedChecks = await client
      .query(QueryGenerator.getChecks(tempTableName))
      .then(({ rows }) => {
        return rows.map(({ name, definition }) => ({
          name,
          condition: parser.checkCondition(definition),
        }));
      });
    await client.query(`drop table ${tempTableName};`);
    return rows.map((_, i) => {
      const nameTempConstraint = getConstraintName(i);
      const { condition } = normalizedChecks.find(
        ({ name }) => name === nameTempConstraint
      );
      return { condition };
    });
  }

  _getSchemaExtensions(client, type) {
    if (type === 'check') {
      return this._normalizeCheckRows(client, this._extensions.check);
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
    table = this.getQuotedObjectName(),
    columns = this._columns,
    temp = false,
    force,
  }) {
    return new ChangeStorage(
      QueryGenerator.createTable(table, columns, force, temp)
    );
  }

  async _getIdentityActualizeQueries(client, structure, options) {
    const fullName = this.getQuotedObjectName();
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
        } = await client.query(
          QueryGenerator.getIdentityColumnSequence(fullName, column)
        );

        const {
          rows: [{ value: curValue }],
        } = await client.query(SequenceQueryGenerator.getCurrentValue(name));

        const {
          rows: [{ max: valueForRestart }],
        } = await client.query(
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

  async _getExtensionCleanupQueries(client, type, structure, options) {
    const fullName = this.getQuotedObjectName();
    const quotedSchema = helpers.quoteIdentifier(this._getSchemaName());

    const queries = new ChangeStorage();
    const willBeCreated = Table.willBeCreated(structure, options);

    if (options.allowClean[type] !== true || willBeCreated) {
      return queries;
    }

    const receivedExtensions = _getReceivedExtensions(structure)[type];
    const schemaExtensions = await this._getSchemaExtensions(client, type);

    receivedExtensions.forEach(({ name, ...props }) => {
      name = helpers.quoteIdentifier(name);
      if (!utils.findWhereEq(props, schemaExtensions)) {
        queries.add(
          type === 'index'
            ? QueryGenerator.removeIndex(quotedSchema, name)
            : QueryGenerator.removeConstraint(fullName, name)
        );
      }
    });

    return queries;
  }

  async _getAddExtensionQueries(client, type, structure, options) {
    const fullName = this.getQuotedObjectName();
    const queries = new ChangeStorage();

    const willBeCreated = Table.willBeCreated(structure, options);
    const receivedExtensions = _getReceivedExtensions(structure)[type];
    const schemaExtensions = await this._getSchemaExtensions(client, type);

    if (!schemaExtensions) {
      return queries;
    }

    schemaExtensions.forEach((extension) => {
      if (willBeCreated || !utils.findWhereEq(extension, receivedExtensions)) {
        queries.add(this._addExtension(type, fullName, extension));
      }
    });

    return queries;
  }
}

module.exports = Table;
