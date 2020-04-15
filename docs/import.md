# import() options

### path

- Type: `string`
- Default: `null`
- Required: `true`

Path to the folder with `*.json` files

### pattern

- Type: `RegExp`
- Default: `/.*\.schema.json$/`
- Required: `true`

Regular expression to filter folder files

### interpolate

- Type: `RegExp`
- Default: `/\${([\s\S]+?)}/g`
- Required: `false`

The 'interpolate' delimiter

### locals

- Type: `object`
- Default: `null`
- Required: `false`

An object to import into the `*.json` files as locals
