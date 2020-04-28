<a href="https://multum.github.io/pg-differ/#/">
    <img src='https://multum.github.io/pg-differ/readme-logo.svg' width='400' alt='pg-differ'>
</a>

_[Node.js](https://nodejs.org/en/) migration tool for [PostgreSQL](https://www.postgresql.org/)_

![](https://github.com/multum/pg-differ/workflows/Lint%20and%20test/badge.svg)
[![](https://img.shields.io/npm/l/pg-differ.svg?style=flat)](https://github.com/multum/pg-differ/blob/master/LICENSE)
[![](https://img.shields.io/npm/v/pg-differ.svg?style=flat)](https://www.npmjs.com/package/pg-differ)
![](https://img.shields.io/codecov/c/github/multum/pg-differ.svg?style=flat)

## Features

- Fully tested
- Fully documented
- [Table](https://multum.github.io/pg-differ/#/metadata/table) and [Sequence](https://multum.github.io/pg-differ/#/metadata/sequence) support
- Updating columns without data loss
- Constraint and index support
- Removing unnecessary constraints/indexes
- [CLI](https://multum.github.io/pg-differ/#/cli)
  - [Creating/adjustment](https://multum.github.io/pg-differ/#/cli?id=sync) of objects
  - [Auto-generating](https://multum.github.io/pg-differ/#/cli?id=generate) schemas for existing objects on the server

## Documentation

- [Documentation](https://multum.github.io/pg-differ/#/)
- [Contributing](https://github.com/multum/pg-differ/blob/master/CONTRIBUTING.md)

## Usage Example

```diff
const Differ = require('pg-differ');

const differ = new Differ({
  connectionConfig: { host: 'localhost', port: 5432, user: 'postgres' },
  logging: true
});

differ.define('table', {
   name: 'users',
   columns: {
      id: { type: 'bigint', primary: true },
      age: {
-        type: 'varchar(32)',
+        type: 'varchar(64)',
+        default: '16',
      },
+     role: { type: 'bigint' },
   },
+  foreignKeys: [
+     {
+        columns: ['role'],
+        references: { table: 'roles', columns: ['id'] },
+     },
+  ],
});

+ differ.define('table', {
+   name: 'roles',
+   columns: {
+      id: { type: 'bigint', identity: true },
+      name: 'character(255)'
+   },
+ });

await differ.sync()
```

<img src='https://multum.github.io/pg-differ/screencast.svg' width='640px'/>

## License

**pg-differ** is open source software [licensed as MIT](https://github.com/multum/pg-differ/blob/master/LICENSE).
