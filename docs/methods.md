# Methods 

### define

* Arguments: (type: `'table'` | `'sequence'`, properties: [`TableProperties`](table.md#properties) | [`SequenceProperties`](sequence.md#properties))
* Returns: [Table](table.md) | [Sequence](sequence.md) 

Table definition

### sync

* Arguments: (options?: [sync options](sync.md))
* Returns: `Promise<null>`

Synchronization of previously defined tables and their seeds

### read.table

* Arguments: (options: [read.table options](read-table.md))
* Returns: [`Promise<TableProperties>`](table.md#properties)

Getting the schema of an existing table

### read.sequence

* Arguments: (options: [read.sequence options](read-sequence.md))
* Returns: [`Promise<SequenceProperties>`](sequence.md#properties)

Getting the schema of an existing sequence
