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

After that you can run the module or use the [CLI](cli.md)

```javascript
const Differ = require('pg-differ');

const setup = async () => {
  const differ = new Differ({
    connectionConfig: {},
    logging: true, // default value of console.log
  });

  differ.setDefaultSchema('user_schema'); // by default 'public'

  differ.import({
    // or/and use 'differ.define' method
    path: './objects',
    locals: { schema: 'schema_name' },
  });

  differ.define('table', {
    name: 'users',
    columns: {
      id: { type: 'bigint', primary: true },
      name: 'varchar(255)',
    },
  });

  return differ.sync();
};

setup().then(() => console.log('database ready'));
```
