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

[Deprecated] The 'interpolate' delimiter

### locals

- Type: `object`
- Default: `null`
- Required: `false`

An object to import into the `*.json` files as locals

```javascript
// index.js
differ.import({
  path: 'objects/role.schema.json',
  locals: {
    schema: 'public',
    sequenceOptions: { min: 1000, start: 1000 },
  },
});
```

```json5
// objects/role.schema.json
{
  type: 'table',
  properties: {
    name: '${schema}.role', // using a variable as part of a string
    columns: {
      id: {
        type: 'int',
        identity: { $: 'sequenceOptions' }, // using a variable as JSON data
      },
      // ...
    },
  },
}
```
