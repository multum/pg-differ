# Configuration

### connectionConfig

- Type: `object`
- Default: `null`
- Required: `true`

Connection configuration object for [node-postgres](https://node-postgres.com/features/connecting#programmatic)

### logging

- Type: `boolean | function`
- Default: `console.info`
- Required: `false`

Option to enable logging in the console or callback of the format `function(...messages) {}` for displaying a message about changes
