/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const utils = require('../utils')

exports.getConstraints = (schema, table) => `
select
  conname as name,
  c.contype as type,
  pg_catalog.pg_get_constraintdef(c.oid, true) as definition
from pg_catalog.pg_constraint as c
  where c.conrelid = '${schema ? `${schema}.${table}` : table}'::regclass order by 1
`

exports.getColumns = (schema, table) => `
select
  pg_catalog.format_type(c.atttypid, c.atttypmod) as data_type,
  ic.collation_name,
  ic.column_default,
  ic.is_nullable,
  ic.column_name
from pg_attribute c
join pg_class t on c.attrelid = t.oid
join pg_namespace n on t.relnamespace = n.oid
join information_schema.columns ic
  on c.attname = ic.column_name
  and t.relname = ic.table_name
  and n.nspname = ic.table_schema
where n.nspname = '${schema}'
  and t.relname = '${table}';
`

exports.getIndexes = (schema, table) => `
select
  indexname as name,
  indexdef as definition
from pg_indexes as i
where schemaname = '${schema}'
  and tablename = '${table}'
  and indexname not in (select conname from pg_catalog.pg_constraint)
`

exports.tableExist = (schema, table) => `
select exists (
  select 1 from pg_tables
    where schemaname = '${schema}'
    and tablename = '${table}'
)
`

exports.publicSearchPath = () => `set local search_path to public`

exports.getMaxValueForRestartSequence = (
  schema,
  table,
  column,
  min,
  max,
  sequenceCurValue,
) => `
select max(${column}) as max
  from ${schema}.${table}
where ${column} between ${min} and ${max}
  and ${column} > ${sequenceCurValue}
`

exports.getRows = (schema, table, orderBy, range) => {
  const chunks = [ `select * from ${schema}.${table}` ]
  if (orderBy) {
    chunks.push(`order by ${orderBy}`)
  }
  if (range) {
    chunks.push(`offset (${range[0]} - 1) rows`)
    if (utils.isExist(range[1])) {
      chunks.push(`fetch first (${range[1]} - ${range[0]} + 1) row only`)
    }
  }
  return chunks.join(' ')
}
