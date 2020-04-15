# Column

### type

- Type: `string`
- Default: `null`
- Required: `true`

Type name (with alias support)

### default

- Type: [DefaultValue](metadata/column-default-value.md)
- Default: `null`
- Required: `false`

Default value

### nullable

- Type: `boolean`
- Default: `true`
- Required: `false`

In the case of `nullable === false`, it will set the constraint `NOT NULL`

### primary

- Type: `boolean`
- Default: `false`
- Required: `false`

Define a `primary key` constraint for a column

### unique

- Type: `boolean`
- Default: `false`
- Required: `false`

Define a `unique` constraint for a column

### [identity](metadata/identity.md)

- Type: `boolean` | [identity object](metadata/identity.md)
- Default: `false`
- Required: `false`

Creates a sequence and writes the increment function in the `default` field of the current column

### formerNames

- Type: `object`
- Default: `null`
- Required: `false`

Array of previous column names that is used to rename
