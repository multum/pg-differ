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

### reconnection

- Type: `Object | Boolean`
- Default: `{ attempts: 10, delay: 5000 }`
- Required: `false`

Configuration for reconnection after connection error

### reconnection.attempts

- Type: `Number`
- Default: `10`
- Required: `false`

Number of reconnection attempts before giving up

### reconnection.delay

- Type: `Number`
- Default: `5000`
- Required: `false`

How long to initially wait before attempting a new reconnection
