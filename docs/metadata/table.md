# Table

## Properties {docsify-ignore}

### name

- Type: `string`
- Default: `null`
- Required: `true`

The name of the format table is `'schema_name.table_name'` or `'table_name'`

### [columns](metadata/column.md)

- Type: `object<{ [name: string]: Column} >`
- Default: `null`
- Required: `true`

### [primaryKey](metadata/primary-key.md)

- Type: `object`
- Default: `null`
- Required: `false`

### [indexes](metadata/index.md)

- Type: `object[]`
- Default: `null`
- Required: `false`

### [foreignKeys](metadata/foreign-key.md)

- Type: `object[]`
- Default: `null`
- Required: `false`

### [unique](metadata/unique.md)

- Type: `object[]`
- Default: `null`
- Required: `false`

### [checks](metadata/check.md)

- Type: `object[]`
- Default: `null`
- Required: `false`
