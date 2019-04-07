# postgres-differ
![](https://forthebadge.com/images/badges/built-with-love.svg)
![](https://forthebadge.com/images/badges/makes-people-smile.svg)

Node.js module for easy synchronization of postgres tables with models (json-schemas), alternative migration 

![](https://travis-ci.com/av-dev/postgres-differ.svg?branch=master)
![](https://img.shields.io/npm/l/pg-differ.svg)
![](https://img.shields.io/npm/v/pg-differ.svg)
![](https://img.shields.io/codecov/c/github/av-dev/postgres-differ.svg)


## Features

  - Easy to use [schema structure](#schema-structure)
  - Creating tables
  - Adding/changing columns
  - Constraint support: 
    - `FOREIGN KEY`
    - `UNIQUE`
    - `PRIMARY KEY`
  - `INDEX` support
  - Seed support
  - Force changing column types *(with `force: true`)*
  - Dropping of unnecessary constraints/indexes *(those that are absent in the schema)*
  - Change logging

### [Documentation](https://av-dev.github.io/postgres-differ/)


## In future
  - [x] Force sync tables(drop and create) *v0.1.8*
  - [x] Support rename column *v1.0.0*
  - [x] Support seeds *v1.0.0*
  - [ ] Support `CHECK` constraint

## Contributing

#### Issue

Suggestions for introducing new features, bug reports, and any other suggestions can be written in the issue. They will be reviewed immediately.

#### Pull Request

Good pull requests, such as patches, improvements, and new features, are a fantastic help. They should remain focused in scope and avoid containing unrelated commits.

Please **ask first** if somebody else is already working on this or the core developers think your feature is in-scope for pg-differ. Generally always have a related issue with discussions for whatever you are including.

Please also provide a **test plan**, i.e. specify how you verified that your addition works.

## License
pg-differ is open source software [licensed as MIT](LICENSE).
