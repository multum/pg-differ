exports.getSequence = (schema, name) => `
select
  start_value, minimum_value, maximum_value, increment, cycle_option
from information_schema.sequences
where sequence_schema = '${schema}'
  and sequence_name = '${name}'
`
