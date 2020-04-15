# Methods

### define

> Differ.prototype.define

- Arguments: (type: `'table' | 'sequence'`, properties: [TableProperties](metadata/table.md) | [SequenceProperties](metadata/sequence.md))
- Returns: `DatabaseObject`

Object definition

### import

> Differ.prototype.import

- Arguments: (options: `FolderPath` | [import options](import.md))
- Returns: `this`

Defining models from `*.json` files. Equivalent to function calls `differ.define(...)`

### sync

> Differ.prototype.sync

- Arguments: (options?: [sync options](sync.md))
- Returns: `Promise<{ queries: string[] }>`

Synchronization of previously defined [objects](objects.md)

### getDefaultSchema

> Differ.prototype.getDefaultSchema

- Arguments: ()
- Returns: `string`

Getting the **default schema**. By default it is equal to `'public'`

### setDefaultSchema

> Differ.prototype.setDefaultSchema

- Arguments: (schema: `string`)
- Returns: `this`

Setting the **default schema**
