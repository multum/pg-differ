# Methods 

### define

* Arguments: (type: `'table' | 'sequence'` , properties: Object)
* Returns: [Model](model.md) | [Sequence](sequence.md) 

Model definition

### sync

* Arguments: `null`
* Returns: `Promise<null>`

Synchronization of previously defined models and their seeds

### read.table

* Arguments: [read.table options](read-table.md)
* Returns: Promise<[model properties](model.md#properties)> 

Getting the schema of an existing table

### read.sequence

* Arguments: [read.sequence options](read-sequence.md)
* Returns: Promise<[sequence properties](sequence.md#properties)> 

Getting the schema of an existing sequence
