# Configuration

### connectionConfig

- Type: `object`
- Default: `null`
- Required: `true`

Connection configuration object for [node-postgres](https://node-postgres.com/features/connecting#programmatic)

### defaultSchema

- Type: `string`
- Default: `'public'`
- Required: `false`

It will be used in objects whose names do not contain a schema name

### logging

- Type: `boolean | function`
- Default: `console.info`
- Required: `false`

Option to enable logging in the console or callback of the format `function(...messages) {}` for displaying a message about changes
