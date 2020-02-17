# CLI

## Usage example

```bash
# connection_string='postgresql://postgres:postgres@127.0.0.1:5432/postgres'
pg-differ sync -c ${connection_string} --set schema=public ./objects
```

## 'sync' arguments

### connectionString

- Alias: `-c`
- Default: `null`
- Required: `false`
- Example: [Connection URI](https://node-postgres.com/features/connecting#connection-uri)

Connection URI to database

### set

- Alias: `-S`
- Default: `null`
- Required: `false`
- Example: `name=value`

Set variable with value to replace placeholders in schema files

### silent

- Alias: `-s`
- Default: `false`
- Required: `false`

Option to disable printing messages through the console

### force

- Alias: `-f`
- Default: `false`
- Required: `false`

Force synchronization of tables and sequences (drop and create)

### version

- Alias: `-v`
- Required: `false`

Print out the installed version

### help

- Alias: `-h, -?`
- Required: `false`

Show this help
