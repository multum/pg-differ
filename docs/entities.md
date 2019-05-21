# Entities {docsify-ignore-all}

* [Model](model.md)
* [Sequence](sequence.md)

## Example

```javascript
const Differ = require('pg-differ')
const path = require('path')

const differ = new Differ({
  connectionConfig: {},
  schemaFolder: path.resolve(__dirname, 'schemas'), // or/and use 'differ.define' method to add model
  logging: true, // default value of console.log
  placeholders: {
    schema: 'schema_name'
  }
})
 
const model = differ.define('table', {
  name: 'schema_name.table_name',
  cleanable: { foreignKeys: true },
  foreignKeys: [
    {
      columns: ['id'],
      references: {
        table: 'reference_table_name',
        columns: ['id']
      }
    }
  ],
  columns: [
    {
      name: 'id',
      type: 'bigint',
      nullable: false,
      primaryKey: true,
      default: 'nextval(\'schema_name.table_name_id\'::regclass)::sql'
    },
    {
      name: 'description',
      type: 'character varying(255)'
    },
    {
      name: 'body',
      type: 'json',
    }
  ],
  seeds: [
    { id: 1, description: 'first seed', body: { ... } },
    { id: 2, description: 'second seed', body: { ... } },
    { id: 3, description: 'third seed', body: { ... } }
  ]
})

differ.define('sequence', {
  name: 'schema_name.table_name_id',
  start: 100
})

// ...
 
model.addSeeds([
  { id: 4, description: 'fourth seed', body: { ... } },
  { id: 5, description: 'fifth seed', body: { ... } },
])
 
differ.sync()
```
