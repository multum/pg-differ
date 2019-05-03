# extensions

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

* Type: `Array<String>`
* Default: `null`
* Required: `false`

Array of strings of table checks


### cleanable

* Type: `Object`
* Default: `{ primaryKey: true }`
* Required: `false`

Object with types `[ index | foreignKey | unique | primaryKey, check ]: Boolean`, which are deleted from the database if they are not defined in the model schema
