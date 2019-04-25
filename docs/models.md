# Models {docsify-ignore-all}

* [Schema](model-schema.md)
* [Methods](model-methods.md)

## Example

```javascript
const Differ = require('pg-differ')
const path = require('path')

 const differ = new Differ({
    dbConfig: {},
    schemaFolder: path.resolve(__dirname, 'schemas'), // or/and use 'differ.define' method to add model,
    seedFolder: path.resolve(__dirname, 'seeds'), // or/and use 'model.addSeeds' method,
    logging: true,
    placeholders: {
      schema: 'schema_name'
    }
 })
 
 const model = differ.define({
     table: 'schema_name.table_name',
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
            primaryKey: true
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
 
 // ...
 
 model.addSeeds([
    { id: 4, description: 'fourth seed', body: { ... } },
    { id: 5, description: 'fifth seed', body: { ... } },
 ])
 
 differ.sync()
```
