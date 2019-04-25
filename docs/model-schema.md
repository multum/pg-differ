# Model schema

> parameters of the `differ.define` method or the `*.schema.json` file structure for `options.schemaFolder`

## table

* Type: `String`
* Default: `null`
* Required: `true`

The name of the format table is `'schema_name.table_name'` or `'table_name'`

## force

* Type: `Boolean`
* Default: `false`
* Required: `false`

Force sync of table (drop and create). Priority over the constructor settings for the current table

## indexes

* Type: `Array<Object>`
* Default: `null`
* Required: `false`

Array of objects with parameters of table indexes

## columns

* Type: `Array<Object>`
* Default: `null`
* Required: `true`

Array of objects with table column parameters

## seeds

* Type: `Array<Object>`
* Default: `null`
* Required: `false`

Array of objects. Key - column name, value - column value

## forceExtensions

* Type: `Array<String>`
* Default: `['primaryKey']`
* Required: `false`

Array with a list of types `['index' | 'foreignKey' | 'unique' | 'primaryKey']`, which are deleted from the database if they are not defined in the model schema
