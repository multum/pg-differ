# Methods 

### define

* Arguments: (type: String, properties: Object)
* Returns: [Model](model.md) | [Sequence](sequence.md) 

Model definition

### sync

* Arguments: `null`
* Returns: `Promise<null>`

Synchronization of previously defined models and their seeds

### getModel

* Arguments: `name: String`
* Returns: [Model](model.md) | `undefined`

Getting a defined model by table name


### getSequence

* Arguments: `name: String`
* Returns: [Sequence](sequence.md) | `undefined`

Getting a defined sequence by name
