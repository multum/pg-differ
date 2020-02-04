/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

interface ReferenceOptions {
  table: string,
  columns: Array<string>,
}

declare type ActionType = 'CASCADE' | 'RESTRICT' | 'NO ACTION'

declare type MatchType = 'FULL' | 'PARTIAL' | 'SIMPLE'

declare type CleanExtensionOptions = {
  primaryKeys?: boolean,
  indexes?: boolean,
  foreignKeys?: boolean,
  unique?: boolean,
  checks?: boolean
}

declare type ColumnValueType = string | number | Array<any> | Object

interface ForeignKeyOptions {
  columns: Array<string>
  match?: MatchType,
  onDelete?: ActionType,
  onUpdate?: ActionType,
  references: ReferenceOptions
}

interface ColumnOptions {
  name: string,
  type: string,
  nullable?: boolean,
  force?: boolean,
  primaryKey?: boolean,
  unique?: boolean,
  default?: ColumnValueType,
  autoIncrement?: boolean | AutoIncrementOptions,
  formerNames?: Array<string>,
}

interface IndexOptions {
  columns: Array<string>,
}

interface SequenceProperties {
  name: string,
  start?: string | number,
  min?: string | number,
  max?: string | number,
  increment?: string | number,
  cycle?: boolean,
}

interface AutoIncrementOptions {
  name?: string,
  start?: string | number,
  min?: string | number,
  max?: string | number,
  increment?: string | number,
  cycle?: boolean,
  actual?: boolean
}

interface CheckOptions {
  condition: string
}

interface TableProperties {
  name: string,
  columns: Array<ColumnOptions>,
  primaryKeys?: Array<IndexOptions>,
  unique?: Array<IndexOptions>,
  indexes?: Array<IndexOptions>,
  foreignKeys?: Array<ForeignKeyOptions>,
  checks?: Array<CheckOptions>
}

interface SyncOptions {
  transaction?: boolean,
  force?: boolean,
  execute?: boolean,
  cleanable?: CleanExtensionOptions,
}

declare type ObjectType = 'table' | 'sequence'

declare type AnyOfSchemas = TableProperties | SequenceProperties

declare class DatabaseObject {
  type: ObjectType;

  getSchemaName(): string;
  getObjectName(): string; // object name without schema
  getFullName(): string; // object name with schema
}

interface ImportOptions {
  path: string,
  match?: RegExp,
  interpolate?: RegExp,
  locals?: { [key: string]: string | number | Object | Array<any>; },
}

interface DifferOptions {
  connectionConfig: object,
  logging?: boolean | Function,
  reconnection?: boolean | {
    attempts: number,
    delay: number
  }
}

declare class Differ {

  constructor(options: DifferOptions);

  sync(options?: SyncOptions): Promise<Array<string>>

  import(options: string | ImportOptions): Map<string, DatabaseObject>

  define(objectType: ObjectType, metadata: AnyOfSchemas): DatabaseObject

  setDefaultSchema(schema: String): this

  objects: Map<string, DatabaseObject>
}

export = Differ;
