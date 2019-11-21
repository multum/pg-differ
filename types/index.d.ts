/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

interface SQL {
    add(line: Array<Object> | Object): this

    getLines(): Array<string>

    getSize(): number

    getStore(): Array<{ operation: string, value: string }>

    join(): String
}

interface DifferOptions {
    connectionConfig: object,
    /** @deprecated */
    schemaFolder?: string,
    /** @deprecated */
    force?: boolean,
    /** @deprecated */
    placeholders?: { [key: string]: string; },
    logging?: boolean | Function,
    reconnection?: boolean | {
        attempts: number,
        delay: number
    }
}

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

interface SequenceReadOptions {
    name: string
}

interface SequenceProperties {
    name: string,
    force?: boolean,
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
    cleanable?: CleanExtensionOptions,
    primaryKeys?: Array<IndexOptions>,
    unique?: Array<IndexOptions>,
    indexes?: Array<IndexOptions>,
    foreignKeys?: Array<ForeignKeyOptions>,
    checks?: Array<CheckOptions>,
    force?: boolean,
    seeds?: Array<Object>,
}

interface TableReadOptions {
    name: string,
    seeds?: boolean | {
        orderBy?: string,
        range?: Array<string | number>
    }
}

interface Schema {
    type: ObjectType,
    properties: AnyOfSchemas
}

interface Table {
    // public methods
    addSeeds(seeds: Array<Object>): null

    // private methods
    _getSqlCreateOrAlterTable(): Promise<SQL>

    _getSqlAddingExtensions(): Promise<SQL>

    _getSqlCleaningExtensions(): Promise<SQL>

    _getSqlInsertSeeds(): SQL

    _getSequences(): Array<Sequence> | null

    _getProperties(): Object

    _getSqlSequenceActualize(): Promise<SQL | null>
}

interface Sequence {
    // private methods
    _getSqlChanges(): Promise<SQL>

    _getQueryIncrement(): string

    _getProperties(): Object

    _getQueryRestart(): string

    _getCurrentValue(): Promise<String>
}

interface SyncOptions {
    transaction?: boolean
}

interface ImportOptions {
    path: string,
    filter?: RegExp,
    interpolate?: RegExp,
    locals?: { [key: string]: string | number | Object | Array<any>; },
}

declare type ObjectType = 'table' | 'sequence'

declare type AnyOfObjects = Table | Sequence

declare type AnyOfSchemas = TableProperties | SequenceProperties

declare class Differ {
    constructor(options: DifferOptions);

    import(options: String | ImportOptions): this

    sync(options?: SyncOptions): Promise<null>

    define: {
        /** @deprecated */
        (objectType: Schema | ObjectType, properties?:  AnyOfSchemas): AnyOfObjects

        (schema: Schema): AnyOfObjects

        table(properties: TableProperties): Table

        sequence(properties: SequenceProperties): Sequence
    };

    read: {
        table(options: TableReadOptions): Promise<TableProperties>
        sequence(options: SequenceReadOptions): Promise<SequenceProperties>
    }
}

export = Differ;
