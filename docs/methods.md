# Methods

### define

> Differ.prototype.define

- Arguments: (objectType: `String`, properties: [TableProperties](table.md#properties) | [SequenceProperties](sequence.md#properties))
- Returns: [Table](table.md) | [Sequence](sequence.md)

Object definition

### import

> Differ.prototype.import

- Arguments: (options: `FolderPath` | [import options](import.md))
- Returns: `differ`

Defining models from `*.json` files. Equivalent to function calls `differ.define(...)`

### prepare

> Differ.prototype.prepare

- Arguments: (options?: [sync options](sync.md))
- Returns: `Promise<Changes>`

Calculating change queries for updating the database

### execute

> Differ.prototype.execute

- Arguments: (`Array<string>`, `options?: { transaction?: boolean }`)
- Returns: `Promise<Array<Response>>`

Executing previously prepared change queries

### sync

> Differ.prototype.sync

- Arguments: (options?: [sync options](sync.md))
- Returns: `Promise<Changes>`

Synchronization of previously defined [objects](objects.md)

### end

> Differ.prototype.end

- Returns: `Promise<void>`

Disconnects the client from the PostgreSQL server

### setDefaultSchema

> Differ.prototype.setDefaultSchema

- Arguments: (schema: `String`)
- Returns: `differ`

Definition of the **default schema**. By default it is equal to `'public'`
