# ForeignKey

### columns

- Type: `string[]`
- Default: `null`
- Required: `true`

List of column names

### references

- Type: `object`
- Default: `null`
- Required: `true`

Object with foreign table parameters

### references.table

- Type: `string`
- Default: `null`
- Required: `true`

Foreign table name

### references.columns

- Type: `string[]`
- Default: `null`
- Required: `true`

Foreign table column names

### match

- Type: `string`
- Default: `'SIMPLE'`
- Required: `false`

Object with required parameters for the `type: 'foreignKey'` index

### onDelete

- Type: `string`
- Default: `'NO ACTION'`
- Required: `false`

`CASCADE`&#124;`RESTRICT`&#124;`NO ACTION`

### onUpdate

- Type: `string`
- Default: `'NO ACTION'`
- Required: `false`

`CASCADE`&#124;`RESTRICT`&#124;`NO ACTION`
