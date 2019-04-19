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
    dbConfig: object,
    schemaFolder?: string,
    seedFolder?: string,
    logging?: boolean | Function,
    force?: boolean,
    placeholders?: { [key: string]: string; },
}

interface ModelOptions {
    table: string,
    columns: Array<ColumnOptions>,
    force?: boolean,
    indexes?: Array<IndexOptions>,
    seeds?: Array<Object>,
    forceIndexes?: Array<IndexType>,
}

interface ReferenceOptions {
    table: string,
    columns: Array<string>,
}

declare type ActionType = 'CASCADE' | 'RESTRICT' | 'NO ACTION'

declare type IndexType = 'primaryKey' | 'index' | 'foreignKey' | 'unique'

declare type ColumnValueType = string | number | Array<any> | Object

interface ForeignKeyOptions {
    match?: string,
    onDelete?: ActionType,
    onUpdate?: ActionType,
    references?: ReferenceOptions
}

interface ColumnOptions extends ForeignKeyOptions {
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

interface IndexOptions extends ForeignKeyOptions {
    type: IndexType,
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

interface Model {
    // public methods
    addSeeds(seeds: Array<Object>): null

    // private methods
    _getSqlCreateOrAlterTable(): Promise<SQL>

    _getSqlConstraintChanges(): Promise<SQL>

    _getSchema(): Object

    _getSqlInsertSeeds(): SQL
}

declare class Differ {
    constructor(options: DifferOptions);

    getModel(name: string): Model | undefined

    define(schema: ModelOptions): Model

    sync(): Promise<null>
}

export = Differ;
