# sync() options

### transaction

- Type: `boolean`
- Default: `true`
- Required: `false`

`true` puts all sql queries in one transaction, which leads to the rollback of changes in case of an error

### execute

- Type: `boolean`
- Default: `true`
- Required: `false`

`true` causes change requests to be executed

### allowClean

- Type: `object`
- Default: `{ primaryKeys: true }`
- Required: `false`

Object with types `[ indexes | foreignKeys | unique | primaryKeys | checks ]: boolean`, which are deleted from the database if they are not defined in the table schema

### force

- Type: `boolean`
- Default: `false`
- Required: `false`

Force synchronization of tables and sequences (drop and create)

### adjustIdentitySequences

- Type: `boolean`
- Default: `false`
- Required: `false`

Restart the identity columns to the largest values of these columns
