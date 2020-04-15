# Getting started

!> pg-differ requires: **[Node.js](https://nodejs.org/)** **v10** or more; **[PostgreSQL Core](https://www.postgresql.org/download/)** **v10** or more

```bash
npm i pg-differ
```

## Writing object schema files

Then create a folder with your first [object schema file](objects.md) or use the `define` method.

```bash
mkdir objects && touch objects/name.schema.json
```

## Initialize

> You can also use the _CLI_

```javascript
const Differ = require('pg-differ');

const differ = new Differ({
  connectionConfig: {},
  logging: true, // default value of console.log
});

differ.setDefaultSchema('CustomSchema'); // by default 'public'

differ.import({
  // or/and use 'differ.define' method
  path: './objects',
  locals: { table: 'children' },
});

const users = differ.define('table', {
  name: 'users',
  foreignKeys: [
    {
      columns: ['id'],
      references: { table: 'children', columns: ['id'] },
    },
  ],
  columns: {
    id: { type: 'bigint', primary: true },
    birthday: { type: 'timestamp', default: ['literal', 'now()'] },
    description: 'character varying(255)',
  },
});

// users.getObjectName() === 'CustomSchema.users'

differ
  .sync({ allowClean: { foreignKeys: true } })
  .then(() => console.log('database ready'));
```
