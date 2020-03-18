# Configuration

### connectionConfig

- Type: `Object`
- Default: `null`
- Required: `true`

Connection configuration object for [node-postgres](https://node-postgres.com/features/connecting#programmatic)

### logging

- Type: `Boolean | Function`
- Default: `console.info`
- Required: `false`

Option to enable logging in the console or callback of the format `function(message) {}` for displaying a message about changes
