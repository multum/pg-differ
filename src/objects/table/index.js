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
const parser = require('../../parser');

const validate = require('../../validate');

const _parseSchema = R.pipe(validate.tableDefinition, parser.schema);

const ORDERED_LIST_OF_COLUMN_ATTRS_TO_UPDATE = [
  'name',
  'nullable',
  'type',
  'default',
  'collate',
];

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

const _findExtensionWhere = (props, extensions) => {
  return extensions && extensions.find(R.whereEq(props));
};

const _getColumnAttributeDiff = (column, dbColumn) => {
  const diff = utils.getObjectDifference(column, dbColumn);
  if (diff.name) {
    diff.name = { new: column.name, old: dbColumn.name };
  }
  if (diff.type) {
    diff.type = { new: column.type, old: dbColumn.type };
  }
  return diff;
};

class Table extends AbstractObject {
  constructor(differ, properties) {
    super(differ, properties);
    this.type = 'table';
    try {
      this._properties = _parseSchema(properties);
    } catch (error) {
      throw new Error(this._logger.formatMessage(error.message));
    }

    this._primaryKey = R.path(['primaryKey', 0], this._properties.extensions);

    this._sequences = _setupSequences(differ, {
      tableName: properties.name,
      columns: this._properties.columns,
    });

    this._normalizeCheckRows = R.once(this._normalizeCheckRows);
  }

  _getCreateOrAlterTableQueries(structure, options) {
    if (options.force) {
      return this._createTable({ force: true });
    } else {
      if (structure) {
        return this._getColumnChangeQueries(structure);
      } else {
        return this._createTable({ force: false });
      }
    }
  }

  _getColumnChangeQueries(structure) {
    const fullName = this.getFullName();
    const dbColumns = structure.columns.map(column => ({
      ...column,
      default: parser.defaultValueInformationSchema(column.default),
    }));
    const queries = new ChangeStorage();
    this._properties.columns.forEach(column => {
      const { name, formerNames } = column;
      const dbColumn = utils.findByName(dbColumns, name, formerNames);
      if (dbColumn) {
        const diff = _getColumnAttributeDiff(column, dbColumn);
        if (utils.isEmpty(diff)) {
          return;
        }
        ORDERED_LIST_OF_COLUMN_ATTRS_TO_UPDATE.forEach(attribute => {
          if (Object.prototype.hasOwnProperty.call(diff, attribute)) {
            const key = attribute;
            const value = diff[key];
            try {
              queries.add(
                QueryGenerator.alterColumn(
                  fullName,
                  this._primaryKey,
                  column,
                  key,
                  value
                )
              );
            } catch (error) {
              throw new Error(this._logger.formatMessage(error.message));
            }
          }
        });
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

    const createQueries = this._createTable({
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
      return this._normalizeCheckRows(this._properties.checks);
    } else {
      return this._properties.extensions[type];
    }
  }

  _willBeCreated(structure, options) {
    return options.force || !structure;
  }

  _addExtension(type, table, extension) {
    const encodedType = parser.encodeExtensionType(type);
    return QueryGenerator.addExtension(encodedType, table, extension);
  }

  _createTable({
    table = this.getFullName(),
    columns = this._properties.columns,
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
    const fullName = this.getFullName();
    const queries = new ChangeStorage();
    const willBeCreated = this._willBeCreated(structure, options);

    if (this._sequences.length === 0 || willBeCreated) {
      return queries;
    }

    for (let i = 0; i < this._sequences.length; i++) {
      const [columnUses, sequence] = this._sequences[i];
      const exists = sequenceStructures.get(sequence.getFullName());
      const { actual = true, min, max } = sequence._properties;
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
    const fullName = this.getFullName();
    const queries = new ChangeStorage();
    const willBeCreated = this._willBeCreated(structure, options);

    if (options.cleanable[type] !== true || willBeCreated) {
      return queries;
    }

    const existingExtensions = _getExistingExtensions(structure);

    const schemaExtensions = await this._getSchemaExtensions(type);

    existingExtensions[type].forEach(extension => {
      if (_findExtensionWhere(extension, schemaExtensions)) {
        return;
      }
      queries.add(
        QueryGenerator.dropExtension(
          this.getSchemaName(),
          fullName,
          type,
          extension
        )
      );
    });

    return queries;
  }

  async _getAddExtensionQueries(type, structure) {
    const fullName = this.getFullName();
    const queries = new ChangeStorage();

    const existingExtensions = _getExistingExtensions(structure);

    const schemaExtensions = await this._getSchemaExtensions(type);

    if (!schemaExtensions) {
      return queries;
    }

    schemaExtensions.forEach(extension => {
      const existing = _findExtensionWhere(extension, existingExtensions[type]);
      if (!existing) {
        queries.add(this._addExtension(type, fullName, extension));
      }
    });

    return queries;
  }
}

module.exports = Table;
