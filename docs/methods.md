# Methods 

### define

* Arguments: (type: `'table' | 'sequence'` , properties: Object)
* Returns: [Table](table.md) | [Sequence](sequence.md) 

Table definition

### sync

* Arguments: `null`
* Returns: `Promise<null>`

Synchronization of previously defined tables and their seeds

### read.table

* Arguments: [read.table options](read-table.md)
* Returns: Promise<[table properties](table.md#properties)> 

Getting the schema of an existing table

### read.sequence

* Arguments: [read.sequence options](read-sequence.md)
* Returns: Promise<[sequence properties](sequence.md#properties)> 

Getting the schema of an existing sequence
