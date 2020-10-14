/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

interface ReferenceOptions {
  table: string;
  columns: string[];
}

declare type ActionType =
  | 'NO ACTION'
  | 'RESTRICT'
  | 'CASCADE'
  | 'SET NULL'
  | 'SET DEFAULT';

declare type MatchType = 'SIMPLE' | 'PARTIAL' | 'FULL';

declare type CleanOptions = {
  primaryKeys?: boolean;
  indexes?: boolean;
  foreignKeys?: boolean;
  unique?: boolean;
  checks?: boolean;
};

declare type ColumnValueType = string | number | any[] | Object;

interface ForeignKeyOptions {
  columns: string[];
  match?: MatchType;
  onDelete?: ActionType;
  onUpdate?: ActionType;
  references: ReferenceOptions;
}

interface ColumnOptions {
  type: string;
  nullable?: boolean;
  primary?: boolean;
  unique?: boolean;
  default?: ColumnValueType;
  identity?: boolean | IdentityOptions;
  formerNames?: string[];
}

interface SequenceProperties {
  name: string;
  start?: string | number;
  min?: string | number;
  max?: string | number;
  increment?: string | number;
  cycle?: boolean;
}

interface IdentityOptions {
  name?: string;
  start?: string | number;
  min?: string | number;
  max?: string | number;
  increment?: string | number;
  cycle?: boolean;
}

interface CheckOptions {
  condition: string;
}

interface IndexOptions {
  columns: string[];
  using: 'btree' | 'hash' | 'gist' | 'gin';
}

interface PrimaryKeyOptions {
  columns: string[];
}

interface UniqueOptions {
  columns: string[];
}

interface TableProperties {
  name: string;
  columns: { [name: string]: ColumnOptions };
  primaryKey?: PrimaryKeyOptions;
  unique?: UniqueOptions[];
  indexes?: IndexOptions[];
  foreignKeys?: ForeignKeyOptions[];
  checks?: CheckOptions[];
}

interface SyncOptions {
  transaction?: boolean;
  force?: boolean;
  execute?: boolean;
  allowClean?: CleanOptions;
  adjustIdentitySequences?: boolean;
}

declare type ObjectType = 'table' | 'sequence';

declare type AnyOfSchemas = TableProperties | SequenceProperties;

declare class DatabaseObject {
  type: ObjectType;
  properties: AnyOfSchemas;

  getObjectName(): string; // 'SchemaName.object_name'
  getQuotedObjectName(): string; // '"SchemaName"."object_name"'
}

interface SyncResult {
  queries: string[];
}

interface ImportOptions {
  path: string;
  match?: RegExp;
  /**
   * @deprecated will be removed in v4.0
   */
  interpolate?: RegExp;
  locals?: { [key: string]: any };
}

interface DifferOptions {
  connectionConfig: object;
  defaultSchema?: string;
  logging?: boolean | Function;
}

declare class Differ {
  constructor(options: DifferOptions);

  /**
   * @example
   * differ.define('sequence', {
   *   name: 'roles_seq',
   *   max: 9999
   * });
   * differ.define('table', {
   *   name: 'users',
   *   columns: {
   *     id: 'integer',
   *     birthday: { type: 'timestamp', default: ['literal', 'now()'] }
   *   }
   * });
   */
  define(type: ObjectType, metadata: AnyOfSchemas): DatabaseObject;

  /**
   * @example
   * differ.import('./objects');
   * differ.import({
   *   path: './objects',
   *   pattern: /.*\.schema.json$/
   * });
   */
  // @ts-ignore
  import(options: string | ImportOptions): this;

  /**
   * @example
   * await differ.sync();
   * await differ.sync({ force: true });
   */
  sync(options?: SyncOptions): Promise<SyncResult>;

  /**
   * @example
   * differ.setDefaultSchema('DifferSchema');
   */
  setDefaultSchema(schema: string): this;

  /**
   * @example
   * differ.getDefaultSchema() === 'public';
   * differ.setDefaultSchema('DifferSchema');
   * differ.getDefaultSchema() === 'DifferSchema';
   */
  getDefaultSchema(): string;

  // @ts-ignore
  objects: Map<string, DatabaseObject>;
}

export = Differ;
