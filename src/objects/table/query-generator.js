/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const utils = require('../../utils');
const parser = require('../../parser');
const { SynchronizationError } = require('../../errors');
const { Types } = require('../../constants');
const { INTEGER, CHARACTER, BOOLEAN } = Types.GROUPS;

const _shouldBePrimaryKey = (primaryKey, column) => {
  if (primaryKey) {
    return primaryKey.columns.includes(column);
  } else {
    return false;
  }
};

const _getColumnDescription = (primaryKey, column, temp) => {
  const chunks = [`${column.name} ${column.type}`];

  if (column.collate) {
    chunks.push(`collate "${column.collate}"`);
  }

  if (column.default != null && temp !== true) {
    chunks.push(`default ${column.default}`);
  }

  if (column.nullable && !_shouldBePrimaryKey(primaryKey, column)) {
    chunks.push('null');
  } else {
    chunks.push('not null');
  }

  return chunks.join(' ');
};

class QueryGenerator {
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
    min,
    max,
    sequenceCurValue
  ) {
    return `
    select max(${column}) as max
      from ${table}
    where ${column} between ${min} and ${max}
      and ${column} > ${sequenceCurValue}`;
  }

  static addColumn(table, primaryKey, column) {
    const columnDescription = _getColumnDescription(primaryKey, column);
    return `alter table ${table} add column ${columnDescription};`;
  }

  static setDefault(table, column, value) {
    return `alter table ${table} alter column ${column.name} set default ${value};`;
  }

  static dropDefault(table, column) {
    return `alter table ${table} alter column ${column.name} drop default;`;
  }

  static dropExtension(schema, table, type, extension) {
    if (type === 'index') {
      return `drop index ${schema}.${extension.name};`;
    } else {
      return `alter table ${table} drop constraint ${extension.name};`;
    }
  }

  static addExtension(encodedType, table, extension) {
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

    columns = columns.join(',');
    switch (encodedType) {
      case 'INDEX':
        return `create ${encodedType} on ${table} (${columns});`;

      case 'UNIQUE':
      case 'PRIMARY KEY':
        return `${alterTable} add ${encodedType} (${columns});`;

      case 'FOREIGN KEY': {
        match = match ? ` match ${match}` : null;
        const refColumns = references.columns.join(',');
        references = `references ${references.table} (${refColumns})`;
        const events = `on update ${onUpdate} on delete ${onDelete}`;
        return `${alterTable} add ${encodedType} (${columns}) ${references}${match} ${events};`;
      }

      case 'CHECK': {
        const constraintName = name ? ` constraint ${name}` : '';
        return `${alterTable} add${constraintName} ${encodedType} (${condition});`;
      }
    }
  }

  static createTable(table, columns, primaryKey, force, temp) {
    columns = columns
      .map(column => _getColumnDescription(primaryKey, column, temp))
      .join(',\n  ');
    return [
      force ? `drop table if exists ${table} cascade;` : null,
      `create${temp ? ' temporary' : ''} table ${table} (\n  ${columns}\n);`,
    ];
  }

  static alterColumn(table, primaryKey, column, key, value) {
    if (key === 'name') {
      return `alter table ${table} rename column ${value.prev} to ${value.next};`;
    } else if (key === 'nullable') {
      if (value === true) {
        if (!_shouldBePrimaryKey(primaryKey, column.name)) {
          return `alter table ${table} alter column ${column.name} drop not null;`;
        }
      } else {
        const setValues = utils.isExist(column.default)
          ? `update ${table} set ${column.name} = ${column.default} where ${column.name} is null;`
          : null;
        return [
          setValues,
          `alter table ${table} alter column ${column.name} set not null;`,
        ];
      }
    } else if (key === 'type' || key === 'collate') {
      const prevTypeGroup = parser.getTypeGroup(value.prev);
      const nextTypeGroup = parser.getTypeGroup(value.next);

      const hasDefault = utils.isExist(column.default);

      // If not an array
      if (value.next.indexOf(']') === -1) {
        const alterColumnType = using => {
          using = using ? ` using (${using})` : '';

          const collate = column.collate ? ` collate "${column.collate}"` : '';
          const alterType = `alter table ${table} alter column ${column.name} type ${column.type}${collate}${using};`;

          if (using && hasDefault) {
            return [
              QueryGenerator.dropDefault(table, column),
              alterType,
              QueryGenerator.setDefault(table, column, column.default),
            ];
          } else {
            return alterType;
          }
        };

        if (
          !value.prev ||
          (prevTypeGroup === INTEGER && nextTypeGroup === INTEGER) ||
          (prevTypeGroup === CHARACTER && nextTypeGroup === CHARACTER) ||
          (prevTypeGroup === INTEGER && nextTypeGroup === CHARACTER)
        ) {
          return alterColumnType();
        } else if (prevTypeGroup === CHARACTER && nextTypeGroup === INTEGER) {
          return alterColumnType(`trim(${column.name})::integer`);
        } else if (prevTypeGroup === BOOLEAN && nextTypeGroup === INTEGER) {
          return alterColumnType(`${column.name}::integer`);
        } else if (prevTypeGroup === INTEGER && nextTypeGroup === BOOLEAN) {
          return alterColumnType(
            `case when ${column.name} = 0 then false else true end`
          );
        }
      }

      if (column.force === true) {
        const columnDescription = _getColumnDescription(primaryKey, column);
        return `alter table ${table} drop column ${column.name}, add column ${columnDescription};`;
      } else {
        throw new SynchronizationError(
          `Impossible type change from '${value.prev}' to '${value.next}' without losing column data`
        );
      }
    } else if (key === 'default') {
      if (utils.isExist(value)) {
        return QueryGenerator.setDefault(table, column, value);
      } else {
        return QueryGenerator.dropDefault(table, column);
      }
    }
    return null;
  }
}

module.exports = QueryGenerator;
