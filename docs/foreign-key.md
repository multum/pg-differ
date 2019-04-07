# foreignKey properties

## match

* Type: `String`
* Default: `'SIMPLE'`
* Required: `false`

Object with required parameters for the `type: 'foreignKey'` index

## onDelete

* Type: `String`
* Default: `'NO ACTION'`
* Required: `false`

`CASCADE`&#124;`RESTRICT`&#124;`NO ACTION`

## onUpdate

* Type: `String`
* Default: `'NO ACTION'`
* Required: `false`

`CASCADE`&#124;`RESTRICT`&#124;`NO ACTION`

## references

* Type: `Object`
* Default: `null`
* Required: `true`

Object with foreign table parameters

## references.table

* Type: `String`
* Default: `null`
* Required: `true`

Foreign table name

## references.columns

* Type: `Array<String>`
* Default: `null`
* Required: `true`

Foreign table column names
