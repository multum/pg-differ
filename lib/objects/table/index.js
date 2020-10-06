/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const Types = require('../../types');
const ChangeStorage = require('../../change-storage');
const AbstractObject = require('../abstract');
const QueryGenerator = require('./query-generator');
const Sequence = require('../sequence');
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
      type: column.type.pure,
      nullable: column.nullable,
      default: column.default,
      collate: column.collate,
    },
    {
      name: receivedColumn.name,
      type: receivedColumn.type.pure,
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

    const { columns, extensions } = parser.schema(this.type, properties);
    this._columns = columns;
    this._extensions = extensions;

    this._normalizeCheckRows = utils.once(this._normalizeCheckRows);
    this._QueryGenerator = new QueryGenerator(this);
  }

  static willBeCreated(structure, options) {
    return options.force || !structure;
  }

  _getCreateOrAlterTableQueries(client, structure, options) {
    if (options.force) {
      return new ChangeStorage(
        this._QueryGenerator.createTable({ force: true })
      );
    } else {
      if (structure) {
        return this._getColumnChangeQueries(client, structure);
      } else {
        return new ChangeStorage(
          this._QueryGenerator.createTable({ force: false })
        );
      }
    }
  }

  async _getColumnChangeQueries(client, structure) {
    const receivedColumns = structure.columns.map((column) => ({
      ...column,
      type: Types.parse(column.type),
      default: parser.literalDefaultValue(column.default),
    }));
    const queries = new ChangeStorage();
    const promises = this._columns.map(async (column) => {
      const receivedColumn = utils.findByName(
        receivedColumns,
        column.name,
        column.formerNames
      );
      if (receivedColumn) {
        if (!column.identity && receivedColumn.identity) {
          queries.add(this._QueryGenerator.dropIdentify(column));
        }
        const diff = _getColumnAttributeDiff(column, receivedColumn);
        queries.add(this._QueryGenerator.alterColumn(column, diff));
      } else {
        queries.add(this._QueryGenerator.addColumn(column));
      }
    });

    await Promise.all(promises);

    return queries;
  }

  _normalizeForeignKeys(rows) {
    if (!rows) return null;
    return rows.map((row) => {
      const {
        references: { table },
      } = row;
      const [schema = this._getSchemaName(), name] = parser.name(table);
      return {
        ...row,
        references: { ...row.references, table: `${schema}.${name}` },
      };
    });
  }

  async _normalizeCheckRows(client, rows) {
    if (!rows || utils.isEmpty(rows)) {
      return rows;
    }

    const getConstraintName = (id) => `temp_constraint_check_${id}`;
    const tempTableName = helpers.addQuotes(`temp_${this._identifier.name}`);

    const createQueries = new ChangeStorage(
      this._QueryGenerator.createTable({
        table: tempTableName,
        temp: true,
      })
    );
    await client.query(createQueries.join());

    const queries = rows.reduce(
      (acc, { condition }, i) =>
        acc.add(
          this._QueryGenerator.createConstraint({
            type: 'check',
            table: tempTableName,
            attributes: { name: getConstraintName(i), condition },
          })
        ),
      new ChangeStorage()
    );
    await client.query(queries.join());

    const normalizedChecks = await client
      .query(this._QueryGenerator.getChecks(tempTableName))
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

  _getNormalizedExtensions(client, type) {
    switch (type) {
      case 'check': {
        return this._normalizeCheckRows(client, this._extensions.check);
      }
      case 'foreignKey': {
        return this._normalizeForeignKeys(this._extensions[type]);
      }
      default: {
        return this._extensions[type];
      }
    }
  }

  _addExtension(type, attributes) {
    if (type === 'index') {
      return this._QueryGenerator.createIndex(attributes);
    }
    return this._QueryGenerator.createConstraint({ type, attributes });
  }

  async _getIdentityUpdateQueries(client, structure, options) {
    const queries = new ChangeStorage();

    const columns = this._columns.filter(({ identity }) => identity);

    if (columns.length === 0 || Table.willBeCreated(structure, options)) {
      return queries;
    }

    const promises = columns.map(async (column) => {
      const receivedColumn = utils.findByName(
        structure.columns,
        column.name,
        columns.formerNames
      );

      if (receivedColumn && receivedColumn.identity) {
        const diff = utils.getDiff(column.identity, receivedColumn.identity);

        const rangeChanged = utils.has('min', diff) || utils.has('max', diff);

        let currentValue;
        if (rangeChanged || options.adjustIdentitySequences) {
          currentValue = await this._getIdentityCurrentValue(client, column);
        }

        if (rangeChanged) {
          const restartValue = Sequence.getRestartValue(
            column.identity,
            currentValue
          );
          if (utils.isExist(restartValue)) {
            currentValue = restartValue;
            diff.restart = restartValue;
          }
        }

        if (options.adjustIdentitySequences) {
          const {
            rows: [{ value }],
          } = await client.query(
            this._QueryGenerator.getRestartSequenceValueByColumnData(
              column,
              column.identity,
              currentValue
            )
          );
          if (utils.isExist(value)) {
            diff.restart = value;
          }
        }
        queries.add(this._QueryGenerator.alterIdentify(column, diff));
      } else {
        const {
          rows: [{ name: serialColumnSequence }],
        } = await client.query(this._QueryGenerator.getColumnSequence(column));
        if (serialColumnSequence) {
          queries.add(
            SequenceQueryGenerator.drop(
              helpers.quoteObjectName(serialColumnSequence)
            )
          );
        }

        queries.add(this._QueryGenerator.addIdentify(column, column.identity));

        if (receivedColumn && options.adjustIdentitySequences) {
          const {
            rows: [{ value }],
          } = await client.query(
            this._QueryGenerator.getRestartSequenceValueByColumnData(
              column,
              column.identity,
              column.identity.start
            )
          );
          if (utils.isExist(value)) {
            queries.add(
              this._QueryGenerator.alterIdentify(column, { restart: value })
            );
          }
        }
      }
    });

    await Promise.all(promises);

    return queries;
  }

  async _getIdentityCurrentValue(client, column) {
    const {
      rows: [{ name }],
    } = await client.query(this._QueryGenerator.getColumnSequence(column));
    const {
      rows: [{ value }],
    } = await client.query(SequenceQueryGenerator.getCurrentValue(name));
    return value;
  }

  async _getExtensionCleanupQueries(client, type, structure, options) {
    const queries = new ChangeStorage();

    if (
      options.allowClean[type] !== true ||
      Table.willBeCreated(structure, options)
    ) {
      return queries;
    }

    const extensions = await this._getNormalizedExtensions(client, type);
    const receivedExtensions = _getReceivedExtensions(structure)[type];

    receivedExtensions.forEach(({ name, ...props }) => {
      if (!extensions || !utils.findWhere(props, extensions)) {
        queries.add(
          type === 'index'
            ? this._QueryGenerator.removeIndex(name)
            : this._QueryGenerator.removeConstraint(name)
        );
      }
    });

    return queries;
  }

  async _getAddExtensionQueries(client, type, structure, options) {
    const queries = new ChangeStorage();

    let extensions = await this._getNormalizedExtensions(client, type);
    if (!extensions) return queries;

    const receivedExtensions = _getReceivedExtensions(structure)[type];

    extensions = Table.willBeCreated(structure, options)
      ? extensions
      : extensions.filter((item) => !utils.findWhere(item, receivedExtensions));

    extensions.forEach((extension) => {
      queries.add(this._addExtension(type, extension));
    });

    return queries;
  }
}

module.exports = Table;
