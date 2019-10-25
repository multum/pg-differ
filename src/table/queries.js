/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const utils = require('../utils')

exports.getMaxValueForRestartSequence = (
  table,
  column,
  min,
  max,
  sequenceCurValue,
) => `
select max(${column}) as max
  from ${table}
where ${column} between ${min} and ${max}
  and ${column} > ${sequenceCurValue}
`

exports.getRows = (table, orderBy, range) => {
  const chunks = [ `select * from ${table}` ]
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

exports.getChecks = (table) => `
select
  conname as name,
  pg_catalog.pg_get_constraintdef(oid, true) as definition
from pg_catalog.pg_constraint
  where contype = 'c'
    and conrelid = '${table}'::regclass order by 1;
`
