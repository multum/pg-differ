# Methods

### sync

- Arguments: (options?: [sync options](sync.md))
- Returns: `Promise<null>`

Synchronization of previously defined tables and their seeds

### import

- Arguments: (options: `FolderPath` | [import options](import.md))
- Returns: `Differ`

Defining models from `*.json` files. Equivalent to function calls `differ.define(...)`

### define.table

- Arguments: (properties: [TableProperties](table.md#properties))
- Returns: [Table](table.md)

Table definition

### define.sequence

- Arguments: (properties: [SequenceProperties](sequence.md#properties))
- Returns: [Sequence](sequence.md)

Sequence definition

### read.table

- Arguments: (options: [read.table options](read-table.md))
- Returns: [`Promise<TableProperties>`](table.md#properties)

Getting the schema of an existing table

### read.sequence

- Arguments: (options: [read.sequence options](read-sequence.md))
- Returns: [`Promise<SequenceProperties>`](sequence.md#properties)

Getting the schema of an existing sequence
