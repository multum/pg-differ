# Objects {docsify-ignore-all}

- [Table](metadata/table.md)
- [Sequence](metadata/sequence.md)

```javascript
const Differ = require('pg-differ');

const differ = new Differ({
  connectionConfig: { ... },
  logging: true, // default value of console.log
});

differ.define('table', {
  name: 'public.users',
  columns: {
    id: { type: 'bigint', primary: true },
    birthday: 'timestamp',
  },
});

differ.define('sequence', {
  name: 'public.children_seq',
  start: 100,
});

await differ.sync({ allowClean: { foreignKeys: true } });
```
