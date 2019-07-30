# Getting started

!> pg-differ requires: **[Node.js](https://nodejs.org/)** **v8** or more; **[PostgreSQL Core](https://www.postgresql.org/download/)** **v9.2** or more, **9.5+** if using **seeds**

```bash
npm i pg-differ
```

## Writing schemas

Then create a folder with your first [schema](entities.md) or use the `define` method.

```bash
mkdir schemas && touch schemas/name.schema.json
```

## Initialize

After that you can run the module or use the [CLI](cli.md)

```javascript
const Differ = require('pg-differ')
const path = require('path')

const setup = async () => {
  const differ = new Differ({
    connectionConfig: {},
    schemaFolder: path.resolve(__dirname, 'schemas'), // or/and use 'differ.define' method,
    logging: true,
    placeholders: {
      schema: 'schema_name'
    }
  })

  const users = await differ.read.table({ name: 'users' })
  if (!users || users.properties.columns.length !== 1) {
    differ.define('table', {
      name: 'users',
      columns: [
        { name: 'id', type: 'bigint', primaryKey: true },
        { name: 'name', type: 'varchar(255)' }
      ]
    })
  }

  return differ.sync()
}

setup()
```
