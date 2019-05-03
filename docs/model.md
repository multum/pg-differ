# Model

## Properties

> parameters of the `differ.define` method or the `*.schema.json` file structure for `options.schemaFolder`

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

### extensions

* Type: [extensions object](model-extensions.md)
* Default: `{ cleanable: { primaryKey: true } }`
* Required: `false`

Object with definitions of `constraints` and `indexes`

## Methods

### addSeeds

* Arguments: `seeds: Array<Object>`
* Returns: `null`

Seed definitions
