# Column

### type

- Type: `String`
- Default: `null`
- Required: `true`

Type name (with alias support)

### default

- Type: [Value](metadata/column-value.md)
- Default: `null`
- Required: `false`

Default value

### nullable

- Type: `Boolean`
- Default: `true`
- Required: `false`

In the case of `nullable === false`, it will set the constraint `NOT NULL`

### primary

- Type: `Boolean`
- Default: `false`
- Required: `false`

Define a `primary key` constraint for a column

### unique

- Type: `Boolean`
- Default: `false`
- Required: `false`

Define a `unique` constraint for a column

### [identity](metadata/identity.md)

- Type: `Boolean` | [identity object](metadata/identity.md)
- Default: `false`
- Required: `false`

Creates a sequence and writes the increment function in the `default` field of the current column

### formerNames

- Type: `Object`
- Default: `null`
- Required: `false`

Array of previous column names that is used to rename
