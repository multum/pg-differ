# CLI

### connectionString

- Alias: `-c`
- Default: `null`
- Required: `false`
- Example: [Connection URI](https://node-postgres.com/features/connecting#connection-uri)

Connection URI to database

### placeholders

- Alias: `-p`
- Default: `null`
- Required: `false`
- Example: `schema:s_name, user:u_name`

String with names and their values to replace placeholders in `schemaFolder` files

### logging

- Alias: `-l`
- Default: `true`
- Required: `false`

Option to enable logging in the console

### force

- Alias: `-f`
- Default: `false`
- Required: `false`

Force sync of tables (drop and create)

### schemaFolder

- Alias: `-s`
- Default: `./schemas`
- Required: `false`

Path to the folder with \*.schema.json files

### version

- Alias: `-v`
- Required: `false`

Print out the installed version

### help

- Alias: `-v`
- Required: `false`

Show this help
