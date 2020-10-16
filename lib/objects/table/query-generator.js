/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const utils = require('../../utils');
const parser = require('../../parser');
const helpers = require('../../helpers');
const { Sequences, Constraints, Indexes } = require('../../constants');
const { isColumnModificationAllowed } = require('./change-rules');
const SequenceQueryGenerator = require('../sequence/query-generator');
const { SyncError } = require('../../errors');

const _identityDescription = (type, { generation, ...properties }) => {
  let result = `generated ${generation} as identity`;

  properties = utils.getDiff(properties, Sequences.getDefaults(type));

  const attrs = SequenceQueryGenerator.setAttributes(properties);
  result += attrs.length ? ` ( ${attrs.join(' ')} )` : '';

  return result;
};

const _joinColumns = (columns) => columns.map(helpers.addQuotes).join(', ');

const _getColumnDescription = (column, temp) => {
  const chunks = [`${helpers.addQuotes(column.name)} ${column.type.pure}`];

  if (column.collate) {
    chunks.push(`collate "${column.collate}"`);
  }

  if (column.default != null && temp !== true) {
    chunks.push(`default ${column.default}`);
  }

  if (column.nullable) {
    chunks.push('null');
  } else {
    chunks.push('not null');
  }

  if (column.identity) {
    chunks.push(_identityDescription(column.type.pure, column.identity));
  }

  return chunks.join(' ');
};

class QueryGenerator {
  constructor(table) {
    this.table = table;
  }

  getChecks(table = this.table.getQuotedObjectName()) {
    return `
    select
      conname as name,
      pg_catalog.pg_get_constraintdef(oid, true) as definition
    from pg_catalog.pg_constraint
      where contype = 'c'
        and conrelid = '${table}'::regclass;`;
  }

  getRestartSequenceValueByColumnData(column, sequence, lastValue) {
    const table = this.table.getQuotedObjectName();
    column = helpers.addQuotes(column.name);
    return `
    select max(${column}) + 1 as value
      from ${table}
    where ${column} between ${sequence.min} and ${sequence.max}
      and ${column} > ${lastValue}`;
  }

  addColumn(column) {
    const table = this.table.getQuotedObjectName();
    const columnDescription = _getColumnDescription(column);
    return `alter table ${table} add column ${columnDescription};`;
  }

  removeIndex(name) {
    name = helpers.addQuotes(name);
    const schema = helpers.addQuotes(this.table._getSchemaName());
    return `drop index ${schema}.${name};`;
  }

  removeConstraint(name) {
    const table = this.table.getQuotedObjectName();
    return `alter table ${table} drop constraint ${helpers.addQuotes(name)};`;
  }

  createIndex(index) {
    const table = this.table.getQuotedObjectName();
    const columns = _joinColumns(index.columns);
    index = utils.getDiff(index, Indexes.Defaults);
    const using = index.using ? ` using ${index.using}` : '';
    return `create index on ${table}${using} ( ${columns} );`;
  }

  createConstraint({
    type,
    attributes,
    table = this.table.getQuotedObjectName(),
  }) {
    type = parser.encodeConstraintType(type);

    const prefix = `alter table ${table} add ${
      attributes.name ? `constraint ${attributes.name} ${type}` : type
    }`;

    switch (type) {
      case 'unique':
      case 'primary key':
        return `${prefix} ( ${_joinColumns(attributes.columns)} );`;

      case 'check': {
        return `${prefix} ( ${attributes.condition} );`;
      }

      case 'foreign key': {
        attributes = utils.getDiff(attributes, Constraints.ForeignKeyDefaults);
        const match = attributes.match ? ` match ${attributes.match}` : '';
        const columns = _joinColumns(attributes.columns);
        const refTable = helpers.quoteObjectName(
          attributes.references.table,
          this.table._getSchemaName()
        );
        const refColumns = _joinColumns(attributes.references.columns);
        const onUpdate = attributes.onUpdate
          ? ` on update ${attributes.onUpdate}`
          : '';
        const onDelete = attributes.onDelete
          ? ` on delete ${attributes.onDelete}`
          : '';
        return (
          prefix +
          ` ( ${columns} ) references ${refTable} ( ${refColumns} )${match}${onUpdate}${onDelete};`
        );
      }
    }
  }

  createTable({
    table = this.table.getQuotedObjectName(),
    columns = this.table._columns,
    force = false,
    temp = false,
  }) {
    columns = columns
      .map((column) => _getColumnDescription(column, temp))
      .join(', ');
    return [
      force ? `drop table if exists ${table} cascade;` : null,
      `create${temp ? ' temporary' : ''} table ${table} ( ${columns} );`,
    ];
  }

  dropIdentify(column) {
    const table = this.table.getQuotedObjectName();
    column = helpers.addQuotes(column.name);
    return `alter table ${table} alter column ${column} drop identity;`;
  }

  addIdentify(column, properties) {
    const table = this.table.getQuotedObjectName();
    return (
      `alter table ${table} alter column ${helpers.addQuotes(column.name)}` +
      ` add ${_identityDescription(column.type.pure, properties)};`
    );
  }

  alterIdentify(column, diff) {
    const table = this.table.getQuotedObjectName();
    column = helpers.addQuotes(column.name);

    let attrs = SequenceQueryGenerator.setAttributes(diff);
    attrs = attrs.map((query) => `set ${query}`);

    if (utils.isExist(diff.generation)) {
      attrs.unshift(`set generated ${diff.generation}`);
    }

    if (utils.isExist(diff.restart)) {
      attrs.push(`restart with ${diff.restart}`);
    }

    if (attrs.length === 0) return;

    return `alter table ${table} alter column ${column} ${attrs.join(' ')};`;
  }

  alterColumn(column, diff) {
    if (utils.isEmptyObject(diff)) return;
    const name = helpers.addQuotes(column.name);
    const table = this.table.getQuotedObjectName();

    // < ! > this order cannot be changed
    return ['name', 'nullable', 'type', 'default', 'collate'].map(
      (attribute) => {
        if (utils.has(attribute, diff)) {
          const key = attribute;
          const value = diff[key];
          if (key === 'name') {
            const prev = helpers.addQuotes(value.prev);
            return `alter table ${table} rename column ${prev} to ${name};`;
          } else if (key === 'nullable') {
            if (value === true) {
              return `alter table ${table} alter column ${name} drop not null;`;
            } else {
              const setValues = utils.isExist(column.default)
                ? `update ${table} set ${name} = ${column.default} where ${name} is null;`
                : null;
              return [
                setValues,
                `alter table ${table} alter column ${name} set not null;`,
              ];
            }
          } else if (key === 'type' || key === 'collate') {
            if (
              key === 'collate' ||
              isColumnModificationAllowed(value.prev, value.next)
            ) {
              const collate = column.collate
                ? ` collate "${column.collate}"`
                : '';
              return `alter table ${table} alter column ${name} type ${column.type.pure}${collate};`;
            } else {
              throw new SyncError(
                `Change the column type from '${value.prev.pure}' to '${value.next.pure}' can result in data loss`
              );
            }
          } else if (key === 'default') {
            if (utils.isExist(value)) {
              return `alter table ${table} alter column ${name} set default ${value};`;
            } else {
              return `alter table ${table} alter column ${name} drop default;`;
            }
          }
        }
      }
    );
  }

  getColumnSequence(column) {
    const table = this.table.getQuotedObjectName();
    return `select pg_get_serial_sequence('${table}', '${column.name}') as name`;
  }
}

module.exports = QueryGenerator;
