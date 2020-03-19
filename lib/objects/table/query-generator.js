/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const utils = require('../../utils');
const helpers = require('../../helpers');
const { Sequences } = require('../../constants');
const { isColumnModificationAllowed } = require('./change-rules');
const SequenceQueryGenerator = require('../sequence/query-generator');
const Sequence = require('../sequence');
const { SynchronizationError } = require('../../errors');

const _identityDescription = ({ generation, ...properties }) => {
  let result = `generated ${generation} as identity`;

  if (!utils.isEmpty(properties)) {
    const options = Object.entries(properties)
      .map(([key, value]) => {
        return SequenceQueryGenerator.setAttribute(key, value);
      })
      .join(' ');
    result += options ? ` ( ${options} )` : '';
  }

  return result;
};

const _quoteAndJoinColumns = columns =>
  columns.map(helpers.quoteIdentifier).join(', ');

const _getColumnDescription = (column, temp) => {
  const quotedColumnName = helpers.quoteIdentifier(column.name);
  const chunks = [`${quotedColumnName} ${column.type.raw}`];

  if (column.collate) {
    chunks.push(`collate "${column.collate}"`);
  }

  if (column.default != null && temp !== true) {
    chunks.push(`default ${column.default}`);
  }

  if (!column.shouldBeNullable) {
    if (column.nullable) {
      chunks.push('null');
    } else {
      chunks.push('not null');
    }
  }

  if (column.identity) {
    chunks.push(_identityDescription(column.identity));
  }

  return chunks.join(' ');
};

class QueryGenerator {
  static setDefault(table, columnName, value) {
    return `alter table ${table} alter column ${columnName} set default ${value};`;
  }

  static dropDefault(table, columnName) {
    return `alter table ${table} alter column ${columnName} drop default;`;
  }

  static getChecks(table) {
    return `
    select
      conname as name,
      pg_catalog.pg_get_constraintdef(oid, true) as definition
    from pg_catalog.pg_constraint
      where contype = 'c'
        and conrelid = '${table}'::regclass order by 1;`;
  }

  static getMaxValueForRestartSequence(
    table,
    column,
    min = Sequences.DEFAULTS.min,
    max = Sequences.DEFAULTS.max,
    sequenceCurValue
  ) {
    column = helpers.quoteIdentifier(column);
    return `
    select max(${column}) as max
      from ${table}
    where ${column} between ${min} and ${max}
      and ${column} > ${sequenceCurValue}`;
  }

  static addColumn(table, column) {
    const columnDescription = _getColumnDescription(column);
    return `alter table ${table} add column ${columnDescription};`;
  }

  static removeIndex(schema, name) {
    return `drop index ${schema}.${name};`;
  }

  static removeConstraint(table, name) {
    return `alter table ${table} drop constraint ${name};`;
  }

  static createIndex(encodedType, table, extension) {
    const columns = _quoteAndJoinColumns(extension.columns);
    return `create ${encodedType} on ${table} ( ${columns} );`;
  }

  static createConstraint(encodedType, table, extension) {
    let {
      columns = [],
      references,
      onDelete,
      onUpdate,
      match,
      condition,
      name,
    } = extension;

    const alterTable = `alter table ${table}`;
    columns = _quoteAndJoinColumns(columns);

    switch (encodedType) {
      case 'UNIQUE':
      case 'PRIMARY KEY':
        return `${alterTable} add ${encodedType} ( ${columns} );`;

      case 'FOREIGN KEY': {
        match = match ? ` match ${match}` : null;
        const quotedRefColumns = _quoteAndJoinColumns(references.columns);
        const quotedRefTable = helpers.quoteObjectName(references.table);
        references = `references ${quotedRefTable} ( ${quotedRefColumns} )`;
        const events = `on update ${onUpdate} on delete ${onDelete}`;
        return `${alterTable} add ${encodedType} ( ${columns} ) ${references}${match} ${events};`;
      }

      case 'CHECK': {
        const constraintName = name ? ` constraint ${name}` : '';
        return `${alterTable} add${constraintName} ${encodedType} ( ${condition} );`;
      }
    }
  }

  static createTable(table, columns, force, temp) {
    columns = columns
      .map(column => _getColumnDescription(column, temp))
      .join(', ');
    return [
      force ? `drop table if exists ${table} cascade;` : null,
      `create${temp ? ' temporary' : ''} table ${table} ( ${columns} );`,
    ];
  }

  static dropIdentify(table, column) {
    const quotedColumnName = helpers.quoteIdentifier(column.name);
    return `alter table ${table} alter column ${quotedColumnName} drop identity;`;
  }

  static addIdentify(table, column, properties) {
    const quotedColumnName = helpers.quoteIdentifier(column.name);
    return (
      `alter table ${table} alter column ${quotedColumnName}` +
      ` add ${_identityDescription(properties)};`
    );
  }

  static alterIdentify(table, column, prevProperties, properties) {
    if (utils.isEmpty(properties)) return null;

    const quotedColumnName = helpers.quoteIdentifier(column.name);

    const options = Object.entries(properties).map(([key, value]) => {
      if (key === 'generation') {
        return `set generation ${value}`;
      } else {
        return `set ${SequenceQueryGenerator.setAttribute(key, value)}`;
      }
    });

    Sequence.validateRangeUpdate(prevProperties, properties);

    return (
      `alter table ${table}` +
      ` alter column ${quotedColumnName} ${options.join(' ')};`
    );
  }

  static alterColumn(table, column, key, value) {
    const quotedColumnName = helpers.quoteIdentifier(column.name);
    if (key === 'name') {
      const prev = helpers.quoteIdentifier(value.prev);
      return `alter table ${table} rename column ${prev} to ${quotedColumnName};`;
    } else if (key === 'nullable') {
      if (column.shouldBeNullable) return null;

      if (value === true) {
        return `alter table ${table} alter column ${quotedColumnName} drop not null;`;
      } else {
        const setValues = utils.isExist(column.default)
          ? `update ${table} set ${quotedColumnName} = ${column.default} where ${quotedColumnName} is null;`
          : null;
        return [
          setValues,
          `alter table ${table} alter column ${quotedColumnName} set not null;`,
        ];
      }
    } else if (key === 'type' || key === 'collate') {
      if (
        key === 'collate' ||
        isColumnModificationAllowed(value.prev, value.next)
      ) {
        const collate = column.collate ? ` collate "${column.collate}"` : '';
        return `alter table ${table} alter column ${quotedColumnName} type ${column.type.raw}${collate};`;
      } else {
        throw new SynchronizationError(
          `Change the column type from '${value.prev.raw}' to '${value.next.raw}' can result in data loss`
        );
      }
    } else if (key === 'default') {
      if (utils.isExist(value)) {
        return QueryGenerator.setDefault(table, quotedColumnName, value);
      } else {
        return QueryGenerator.dropDefault(table, quotedColumnName);
      }
    }
    return null;
  }

  static getIdentityColumnSequence(table, column) {
    return `select pg_get_serial_sequence('${table}', '${column.name}') as name`;
  }

  static restartIdentity(table, column, value) {
    const quotedColumnName = helpers.quoteIdentifier(column.name);
    return (
      `alter table ${table}` +
      ` alter column ${quotedColumnName} restart with ${value};`
    );
  }
}

module.exports = QueryGenerator;
