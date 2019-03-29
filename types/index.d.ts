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

interface ForeignOptions {
    match?: string,
    onDelete?: ActionType,
    onUpdate?: ActionType,
    references?: ReferenceOptions
}

interface ColumnOptions extends ForeignOptions {
    name: string,
    type: string,
    nullable?: boolean,
    force?: boolean,
    primaryKey?: boolean,
    unique?: boolean,
    default?: ColumnValueType,
    formerNames?: Array<string>,
}

interface IndexOptions extends ForeignOptions {
    type: IndexType,
    columns: Array<string>,
}

interface Model {
    // public methods
    addSeeds(seeds: Array<Object>): null

    // private methods
    _getSqlColumnDifferences(): Promise<SQL>

    _getSqlConstraintDifferences(): Promise<SQL>

    _getSchema(): Object

    _belongsTo(model: Model): null

    _getSqlInsertSeeds(): SQL
}

declare class Differ {
    constructor(options: DifferOptions);

    getModel(name: string): Model | undefined

    define(schema: ModelOptions): Model

    sync(): Promise<null>
}

export = Differ;
