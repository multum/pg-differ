/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const R = require('ramda');
const ChangeStorage = require('../../change-storage');
const QueryGenerator = require('./query-generator');
const AbstractObject = require('../abstract');

const utils = require('../../utils');
const helpers = require('../../helpers');
const parser = require('../../parser');

const _setupSequences = (differ, { columns, tableName }) => {
  const sequenceColumns = columns.filter(column => column.autoIncrement);
  if (sequenceColumns.length) {
    return sequenceColumns.map(column => {
      const { autoIncrement: properties } = column;
      const sequence = differ._createObject('sequence', {
        name: `${tableName}_${column.name}_seq`,
        ...properties,
      });
      column.default = sequence._getIncrementQuery();
      return [column.name, sequence];
    });
  } else {
    return [];
  }
};

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

const _getColumnAttributeDiff = (column, dbColumn) => {
  const diff = utils.getObjectDifference(column, dbColumn);
  if (diff.name) {
    diff.name = { next: column.name, prev: dbColumn.name };
  }
  if (diff.type) {
    diff.type = { next: column.type, prev: dbColumn.type };
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
    this._primaryKey = R.path(['primaryKey', 0], extensions);

    this._sequences = _setupSequences(differ, {
      tableName: this.getObjectName(),
      columns: this._columns,
    });

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
    const dbColumns = structure.columns.map(column => ({
      ...column,
      default: parser.defaultValueInformationSchema(
        column.default,
        this._differ.defaultSchema
      ),
    }));
    const queries = new ChangeStorage();
    this._columns.forEach(column => {
      const { name, formerNames } = column;
      const dbColumn = utils.findByName(dbColumns, name, formerNames);
      if (dbColumn) {
        const diff = _getColumnAttributeDiff(column, dbColumn);
        if (utils.isEmpty(diff)) {
          return;
        }
        ['name', 'nullable', 'type', 'default', 'collate'].forEach(
          attribute => {
            if (Object.prototype.hasOwnProperty.call(diff, attribute)) {
              const key = attribute;
              const value = diff[key];
              queries.add(
                QueryGenerator.alterColumn(
                  fullName,
                  this._primaryKey,
                  column,
                  key,
                  value
                )
              );
            }
          }
        );
      } else {
        return queries.add(
          QueryGenerator.addColumn(fullName, this._primaryKey, column)
        );
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
      return QueryGenerator.addIndex(encodedType, table, extension);
    }
    return QueryGenerator.addConstraint(encodedType, table, extension);
  }

  _getCreateTableQueries({
    table = this.getQuotedFullName(),
    columns = this._columns,
    temp = false,
    force,
  }) {
    return new ChangeStorage(
      QueryGenerator.createTable(table, columns, this._primaryKey, force, temp)
    );
  }

  getSequences() {
    return this._sequences.map(([, sequence]) => sequence);
  }

  async _getSequenceActualizeQueries(structure, sequenceStructures, options) {
    const fullName = this.getQuotedFullName();
    const queries = new ChangeStorage();
    const willBeCreated = Table.willBeCreated(structure, options);

    if (this._sequences.length === 0 || willBeCreated) {
      return queries;
    }

    for (let i = 0; i < this._sequences.length; i++) {
      const [columnUses, sequence] = this._sequences[i];
      const exists = sequenceStructures.get(sequence.getFullName());
      const { actual = true, min, max } = sequence.properties;
      if (actual && exists) {
        const sequenceCurValue = await sequence._getCurrentValue();
        const {
          rows: [{ max: valueForRestart }],
        } = await this._client.query(
          QueryGenerator.getMaxValueForRestartSequence(
            fullName,
            columnUses,
            min,
            max,
            sequenceCurValue
          )
        );
        if (utils.isExist(valueForRestart)) {
          queries.add(sequence._getRestartQuery(valueForRestart));
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
            ? QueryGenerator.dropIndex(quotedSchema, name)
            : QueryGenerator.dropConstraint(fullName, name)
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
