/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

exports.getSequence = (schema, name) => `
select
  start_value, minimum_value, maximum_value, increment, cycle_option
from information_schema.sequences
where sequence_schema = '${schema}'
  and sequence_name = '${name}'
`

exports.increment = (schema, name) => `nextval('${schema}.${name}'::regclass)`

exports.restart = (schema, name, value) => `alter sequence ${schema}.${name} restart with ${value}`

exports.getCurrentValue = (schema, name) => `select last_value as "currentValue" from ${schema}.${name}`

exports.hasCorrectCurrValue = (schema, name, min, max) => `
select exists ( 
  select last_value from ${schema}.${name}
    where last_value between ${min} and ${max}
) as correct
`
