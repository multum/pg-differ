# Objects {docsify-ignore-all}

- [Table](table.md)
- [Sequence](sequence.md)

## Usage example

```javascript
const Differ = require('pg-differ');

const differ = new Differ({
  connectionConfig: {},
  logging: true, // default value of console.log
});

differ.import({
  // or/and use 'differ.define' method
  path: 'schemas',
  locals: { schema: 'schema_name' },
});

differ.define('table', {
  name: 'schema_name.table_name',
  foreignKeys: [
    {
      columns: ['id'],
      references: {
        table: 'reference_table_name',
        columns: ['id'],
      },
    },
  ],
  columns: {
    id: {
      type: 'bigint',
      primary: true,
      default: {
        type: 'literal',
        value: `nextval('schema_name.table_name_id'::regclass)`,
      },
    },
    description: 'character varying(255)',
    body: 'json',
  },
});

differ.define('sequence', {
  name: 'schema_name.table_name_id',
  start: 100,
});

differ.sync({ cleanable: { foreignKeys: true } });
```
