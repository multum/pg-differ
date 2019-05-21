## 1.3.3

#### Bug Fix

* Added escaping for Object or Array in `column.default` key (or in the value of the column  in `seeds`)

## 1.3.2

#### Bug Fix

* A single quote in the string for the `column.default` key (or the column value in `seeds`) caused an error. Added escaping for strings

## 1.3.1

#### Enhancement

* added property `name` to `column.autoIncrement`

#### Internal

* schema validation method refactored
* code optimized
* dependencies updated
* update docs

## 1.3.0

#### Enhancement

* added the ability to create a **sequence** using the `autoIncrement` in columns

#### Internal

* code optimized
* increased test coverage
* documentation migrated to [GitHub Pages](https://av-dev.github.io/postgres-differ/#/)

## 1.2.0

#### Enhancement

* added special syntax `::sql` for defining SQL in values and default values
* removed auto-add of unique restriction for adding foreignKey
* added `differ.getModel` method to get the model object

#### Bug Fix

* fixed the error that occurred when checking the existence of a table in PostgreSQL 9.2
* fixed incorrect comparison of `column.default` values
* changed model object returned by 'differ.define' method. Now the link to the model is always the same

#### Internal

* increased test coverage. Now it is ***96%***
* code optimized
* renamed Model functions
* removed unnecessary methods
* added codecov reports
* improved logging

#### Migrating from 1.1.1 to 1.2.0

Column value definitions (column.default and seed values)
```javascript
// v1.1.1
'\'Default string\''   // string types
'now()'                // sql functions

// v1.2.0
'Default string'       // string types
'now()::sql'           // sql functions 
```
 
## 1.1.1

#### Bug Fix
 * Fixed a bug that caused the 'seeds' parameter to be ignored in the 'differ.define' method
 * Fixed a bug that occurred when counting inserted seeds
 
## 1.1.0

#### Enhancement
 * Added object/array syntax support for fields of type JSON ([#23](https://github.com/av-dev/postgres-differ/issues/23))
 * Refactoring the postgres query manager
 * Removed unnecessary parameter 'logger'

#### Migrating from 1.0.3 to 1.1.0

```javascript
const differ = new Differ({
  ...options,
    
  // v1.0.3
  // logging: true,
  // logger: function(message){} 
    
  // v1.1.0
  logging: function(message){},
})
 
differ.define({
  ...options,
  columns: [
    {
      'name': 'column_name',
      'type': 'json',
      
      // v1.0.3
      // default value for json type not supported,
      
      // v1.1.0
      'default': {
        1: '...',
        2: '...'
      }
    }
  ]
})
```

## 1.0.3

#### Bug Fix
 * Fix error with npm files
 
## 1.0.2

#### Enhancement
 * Added declaration file index.d.ts ([#20](https://github.com/av-dev/postgres-differ/pull/20))
 * Concatenated the logger arguments into one ([#19](https://github.com/av-dev/postgres-differ/pull/19))
 
## 1.0.1

#### Bug Fix
 * Fix logging. Tab correction
 * Added seedFolder option in CLI

## 1.0.0

#### Enhancement
 * Seed support ([issue #15](https://github.com/av-dev/postgres-differ/issues/15))
 * Converting values without removing them when changing the type of the column 'boolean' => 'integer' and 'integer' => 'boolean' ([issue #14](https://github.com/av-dev/postgres-differ/issues/14))
 * Ability to rename table columns ([issue #10](https://github.com/av-dev/postgres-differ/issues/10))
