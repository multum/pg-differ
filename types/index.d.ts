/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

interface DifferOptions {
    dbConfig: object,
    schemaFolder?: string,
    seedFolder?: string,
    logger?: Function,
    logging?: boolean,
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

declare type IndexType= 'primaryKey' | 'index' | 'foreignKey' | 'unique'

interface ForeignOptions {
    match?: string,
    onDelete?: ActionType,
    onUpdate?: ActionType,
    references?: ReferenceOptions
}

interface ColumnOptions extends ForeignOptions {
    name: string,
    type: string,
    default?: string | number,
    nullable?: boolean,
    force?: boolean,
    primaryKey?: boolean,
    unique?: boolean,
    formerNames?: Array<string>,
}

interface IndexOptions extends ForeignOptions {
    type: IndexType,
    columns: Array<string>,
}

interface Model {
    addSeeds(seeds: Array<Object>)
}

declare class Differ {
    constructor(options: DifferOptions);

    define(schema: ModelOptions): Model

    sync(): Promise<null>
}

export = Differ;
