# Configuration 

### connectionConfig

* Type: `Object`
* Default: `null`
* Required: `true`

Connection configuration object for [node-postgres](https://node-postgres.com/features/connecting#programmatic)

### schemaFolder

* Type: `String`
* Default: `null`
* Required: `false`

Path to the folder with `*.schema.json` files for automatic model definitions. Equivalent to function calls [define](methods.md#define)

### logging

* Type: `Boolean | Function`
* Default: `console.info`
* Required: `false`

Option to enable logging in the console or callback of the format `function(message) {}` for displaying a message about changes

### force

* Type: `Boolean`
* Default: `false`
* Required: `false`

Force sync of tables (drop and create)

### placeholders

* Type: `Object`
* Default: `null`
* Required: `false`

Object with names and their values to replace placeholders in `schemaFolder` files
