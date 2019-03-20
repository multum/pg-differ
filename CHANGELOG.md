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
