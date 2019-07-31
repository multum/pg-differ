# Table

## Usage example {docsify-ignore}

```javascript
const differ = new Differ(...)
const table = differ.define('table', properties)
table.addSeeds([...])
differ.sync().then(() => console.log('database ready'))
```

## Properties

### name

* Type: `String`
* Default: `null`
* Required: `true`

The name of the format table is `'schema_name.table_name'` or `'table_name'`

### force

* Type: `Boolean`
* Default: `false`
* Required: `false`

Force sync of table (drop and create). Priority over the constructor settings for the current table

### columns

* Type: `Array<Object>`
* Default: `null`
* Required: `true`

Array of [objects with table column parameters](columns.md)

### seeds

* Type: `Array<Object>`
* Default: `null`
* Required: `false`

Array of objects. Key - column name, value - column value

### cleanable

* Type: `Object`
* Default: `null`
* Required: `false`

Object with types `[ indexes | foreignKeys | unique | primaryKeys, checks ]: Boolean`, which are deleted from the database if they are not defined in the table schema

### indexes

* Type: `Array<Object>`
* Default: `null`
* Required: `false`

Array of objects with parameters of table indexes

### foreignKeys

* Type: `Array<Object>`
* Default: `null`
* Required: `false`

Array of [objects with parameters](foreign-key.md) of table foreign keys

### unique

* Type: `Array<Object>`
* Default: `null`
* Required: `false`

Array of [objects with parameters](unique.md) of table unique

### primaryKeys

* Type: `Array<Object>`
* Default: `null`
* Required: `false`

Array of [objects with parameters](primaryKey.md) of table primary keys

### checks

* Type: `Array<Object>`
* Default: `null`
* Required: `false`

Array of [objects with parameters](check.md) of table checks

## Methods

### addSeeds

* Arguments: (seeds: `Array<Object>`)
* Returns: `null`

Seed definitions