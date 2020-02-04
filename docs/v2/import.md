# import() options

### path

- Type: `String`
- Default: `null`
- Required: `true`

Path to the folder with `*.json` files

### filter

- Type: `RegExp`
- Default: `/.*\.schema.json$/`
- Required: `false`

Regular expression to filter folder files

### interpolate

- Type: `RegExp`
- Default: `/\${([\s\S]+?)}/g`
- Required: `false`

The 'interpolate' delimiter

### locals

- Type: `Object<Object|Array|String|Number>`
- Default: `null`
- Required: `false`

An object to import into the `*.json` files as locals
