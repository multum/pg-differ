# read.table options

### name

- Type: `String`
- Default: `null`
- Required: `true`

The name of the format table is `'schema_name.table_name'` or `'table_name'`

### seeds

- Type: `Boolean | Object`
- Default: `false`
- Required: `false`

Configures seed loading

### seeds.orderBy

- Type: `String`
- Default: `null`
- Required: `false`

### seeds.range

- Type: `Array[start, [end]]`
- Default: `null`
- Required: `false`

Indicates the lower and upper limits of the row loading range
