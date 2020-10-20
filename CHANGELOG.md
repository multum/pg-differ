## 3.5.0

#### Enhancement

- add new **interpolation syntax** for using variables in schemas

#### Internal

- improve test :gem:

## 3.4.0

#### Enhancement

- significantly improve **identity column** update. You can now increase the minimum value and decrease the maximum value
- add reset `search_path` to `public` value for more accurate reading of database metadata

#### Bug Fix

- add removal of **serial sequence** before setting `column.identity` property. Fix [#96](https://github.com/multum/pg-differ/issues/96)
- fix the use of the `defaultSchema` in the `foreignKeys[].references.table`

#### Internal

- bump dependencies :package:
- improve codebase :sparkles:

## 3.3.0

#### Enhancement

- added `indexes[].using` option
- added `defaultSchema` option to constructor
- added **config file** support for **_CLI_**

#### Internal

- update dependencies :package:

## 3.2.2

#### Bug Fix

- fixed incorrect sequence update validation
- fixed a bug that occurred when using numbers in `import.locals`

## 3.2.1

#### Bug Fix

- added missing values for `ForeignKey.[onUpdate|onDelete]`

## 3.2.0

#### Enhancement

- added short aliases for long data type to `generate` command

#### Bug Fix

- only necessary files published on **_npm_**

#### Internal

- update dependencies :package:
- refactor data type parsing

## 3.1.0

#### Enhancement

- added `generate` command to **_CLI_** :tada:

#### Internal

- cosmetic improvement codebase :sparkles:
- update dependencies :package:

## 3.0.0

#### Completely redesigned

- simplified interface :gem:
- optimized synchronization algorithm

#### Completely redesigned and improved tests

- _**100%**_ coverage :tada:
- most use cases are covered
- all tests are independent of each other
