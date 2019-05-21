/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


interface SQL {
    add(line: Array<Object> | Object): this,

    getLines(): Array<string>,

    getSize(): number
}

interface DifferOptions {
    connectionConfig: object,
    schemaFolder?: string,
    logging?: boolean | Function,
    force?: boolean,
    placeholders?: { [key: string]: string; },
}

interface ReferenceOptions {
    table: string,
    columns: Array<string>,
}

declare type ActionType = 'CASCADE' | 'RESTRICT' | 'NO ACTION'

declare type MatchType = 'FULL' | 'PARTIAL' | 'SIMPLE'

declare type CleanExtensionOptions = {
    primaryKey: boolean,
    index: boolean,
    foreignKey: boolean,
    unique: boolean,
    check: boolean
}

declare type ColumnValueType = string | number | Array<any> | Object

interface ForeignKeyOptions {
    columns: Array<string>
    match?: MatchType,
    onDelete?: ActionType,
    onUpdate?: ActionType,
    references?: ReferenceOptions
}

interface ColumnOptions {
    name: string,
    type: string,
    nullable?: boolean,
    force?: boolean,
    primaryKey?: boolean,
    unique?: boolean,
    default?: ColumnValueType,
    autoIncrement?: boolean | SequenceOptions,
    formerNames?: Array<string>,
}

interface IndexOptions {
    columns: Array<string>,
}

interface SequenceOptions {
    name?: string,
    start?: string | number,
    min?: string | number,
    max?: string | number,
    increment?: string | number,
    cycle?: boolean,
}

interface CheckOptions {
    condition: string
}

interface TableOptions {
    name: string,
    columns: Array<ColumnOptions>,
    cleanable?: CleanExtensionOptions,
    primaryKeys?: Array<IndexOptions>,
    unique?: Array<IndexOptions>,
    indexes?: Array<IndexOptions>,
    foreignKeys?: Array<ForeignKeyOptions>,
    checks?: Array<CheckOptions>,
    force?: boolean,
    seeds?: Array<Object>,
}

interface Schema {
    type: string,
    properties: TableOptions | SequenceOptions
}

interface Model {
    // public methods
    addSeeds(seeds: Array<Object>): null

    // private methods
    _getSqlCreateOrAlterTable(): Promise<SQL>

    _getSqlExtensionChanges(): Promise<SQL>

    _getSqlInsertSeeds(): SQL

    _getProperties(): Object
}

interface Sequence {
    // private methods
    _getSqlChanges(): Promise<SQL>

    _getSqlIncrement(): string

    _getProperties(): Object
}

declare type EntityType = 'table' | 'sequence'

declare class Differ {
    constructor(options: DifferOptions);

    getModel(name: string): Model | undefined

    getSequence(name: string): Sequence | undefined

    define(entityType: Schema | EntityType, properties?: Schema): Model | Sequence

    sync(): Promise<null>
}

export = Differ;
