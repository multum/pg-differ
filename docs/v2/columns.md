# columns

### name

- Type: `String`
- Default: `null`
- Required: `true`

Column name

### type

- Type: `String`
- Default: `null`
- Required: `true`

Type name (with alias support)

### default

- Type: [Value](column-value.md)
- Default: `null`
- Required: `false`

Default value

### nullable

- Type: `Boolean`
- Default: `true`
- Required: `false`

In the case of `nullable === false`, it will set the constraint `NOT NULL`

### force

- Type: `Boolean`
- Default: `false`
- Required: `false`

Deleting column values in case of impossible conversion of values to a new type

### primary

- Type: `Boolean`
- Default: `false`
- Required: `false`

Define a `PRIMARY KEY` constraint for a column

### unique

- Type: `Boolean`
- Default: `false`
- Required: `false`

Define a `UNIQUE` constraint for a column

### formerNames

- Type: `Array<String>`
- Default: `null`
- Required: `false`

Array of previous column names that is used to rename

### autoIncrement

- Type: `Boolean` | [autoIncrement object](auto-increment.md)
- Default: `false`
- Required: `false`

Creates a sequence and writes the increment function in the `default` field of the current column
