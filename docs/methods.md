# Methods

### define

> Differ.prototype.define

- Arguments: (objectType: `String`, properties: [TableProperties](metadata/table.md#properties) | [SequenceProperties](metadata/sequence.md#properties))
- Returns: [Table](metadata/table.md) | [Sequence](metadata/sequence.md)

Object definition

### import

> Differ.prototype.import

- Arguments: (options: `FolderPath` | [import options](import.md))
- Returns: `this`

Defining models from `*.json` files. Equivalent to function calls `differ.define(...)`

### sync

> Differ.prototype.sync

- Arguments: (options?: [sync options](sync.md))
- Returns: `Promise<{ queries: String[] }>`

Synchronization of previously defined [objects](objects.md)

### setDefaultSchema

> Differ.prototype.setDefaultSchema

- Arguments: (schema: `String`)
- Returns: `this`

Definition of the **default schema**. By default it is equal to `'public'`
