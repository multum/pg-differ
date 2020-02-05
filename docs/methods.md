# Methods

### sync

> Differ.prototype.sync

- Arguments: (options?: [sync options](sync.md))
- Returns: `Promise<ChangesMap>`

Synchronization of previously defined [objects](objects.md)

### import

- Arguments: (options: `FolderPath` | [import options](import.md))
- Returns: `differ`

Defining models from `*.json` files. Equivalent to function calls `differ.define(...)`

### define

> Differ.prototype.define

- Arguments: (objectType: `String`, properties: [TableProperties](table.md#properties) | [SequenceProperties](sequence.md#properties))
- Returns: [Table](table.md) | [Sequence](sequence.md)

Object definition

### setDefaultSchema

> Differ.prototype.setDefaultSchema

- Arguments: (schema: `String`)
- Returns: `differ`

Definition of the **default schema**. By default it is equal to `'public''`
