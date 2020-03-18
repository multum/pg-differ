/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

interface ReferenceOptions {
  table: string,
  columns: string[],
}

declare type ActionType = 'CASCADE' | 'RESTRICT' | 'NO ACTION'

declare type MatchType = 'FULL' | 'PARTIAL' | 'SIMPLE'

declare type CleanOptions = {
  primaryKeys?: boolean,
  indexes?: boolean,
  foreignKeys?: boolean,
  unique?: boolean,
  checks?: boolean
}

declare type ColumnValueType = string | number | any[] | Object

interface ForeignKeyOptions {
  columns: string[]
  match?: MatchType,
  onDelete?: ActionType,
  onUpdate?: ActionType,
  references: ReferenceOptions
}

interface ColumnOptions {
  type: string,
  nullable?: boolean,
  primary?: boolean,
  unique?: boolean,
  default?: ColumnValueType,
  identity?: boolean | IdentityOptions,
  formerNames?: string[],
}

interface IndexOptions {
  columns: string[],
}

interface SequenceProperties {
  name: string,
  start?: string | number,
  min?: string | number,
  max?: string | number,
  increment?: string | number,
  cycle?: boolean,
}

interface IdentityOptions {
  name?: string,
  start?: string | number,
  min?: string | number,
  max?: string | number,
  increment?: string | number,
  cycle?: boolean
}

interface CheckOptions {
  condition: string
}

interface TableProperties {
  name: string,
  columns: { [name: string]: ColumnOptions },
  primaryKey?: IndexOptions,
  unique?: IndexOptions[],
  indexes?:IndexOptions[],
  foreignKeys?: ForeignKeyOptions[],
  checks?: CheckOptions[]
}

interface SyncOptions {
  transaction?: boolean,
  force?: boolean,
  execute?: boolean,
  allowClean?: CleanOptions,
  correctIdentitySequences?: boolean
}

declare type ObjectType = 'table' | 'sequence'

declare type AnyOfSchemas = TableProperties | SequenceProperties

declare class DatabaseObject {
  type: ObjectType;
  properties: AnyOfSchemas;

  getSchemaName(): string;      // 'SchemaName'
  getObjectName(): string;      // 'object_name'
  getFullName(): string;        // 'SchemaName.object_name'
  getQuotedFullName(): string;  // '"SchemaName"."object_name"'
}

declare type ArrayOfChanges = string[]

interface ImportOptions {
  path: string,
  match?: RegExp,
  interpolate?: RegExp,
  locals?: { [key: string]: string | number | Object | any[]; },
}

interface DifferOptions {
  connectionConfig: object,
  logging?: boolean | Function
}

declare class Differ {

  constructor(options: DifferOptions);

  define(objectType: ObjectType, metadata: AnyOfSchemas): DatabaseObject

  // @ts-ignore
  import(options: string | ImportOptions): Map<string, DatabaseObject>

  sync(options?: SyncOptions): Promise<ArrayOfChanges>

  setDefaultSchema(schema: String): this

  // @ts-ignore
  objects: Map<string, DatabaseObject>
}

export = Differ;
