# Table

## Usage example {docsify-ignore}

```javascript
const differ = new Differ();
differ.define('table', properties);
differ.sync().then(() => console.log('database ready'));
```

## Properties

### name

- Type: `String`
- Default: `null`
- Required: `true`

The name of the format table is `'schema_name.table_name'` or `'table_name'`

### columns

- Type: `Array<Object>`
- Default: `null`
- Required: `true`

Array of [objects with table column parameters](columns.md)

### indexes

- Type: `Array<Object>`
- Default: `null`
- Required: `false`

Array of objects with parameters of table indexes

### foreignKeys

- Type: `Array<Object>`
- Default: `null`
- Required: `false`

Array of [objects with parameters](foreign-key.md) of table foreign keys

### unique

- Type: `Array<Object>`
- Default: `null`
- Required: `false`

Array of [objects with parameters](unique.md) of table unique

### primaryKeys

- Type: `Array<Object>`
- Default: `null`
- Required: `false`

Array of [objects with parameters](primaryKey.md) of table primary keys

### checks

- Type: `Array<Object>`
- Default: `null`
- Required: `false`

Array of [objects with parameters](check.md) of table checks
