# Sequence

## Usage example {docsify-ignore}

```javascript
const differ = new Differ(...)
const sequence = differ.define('sequence', properties)
differ.sync().then(() => console.log('database ready'))
```

## Properties

### name

* Type: `String`
* Default: `null`
* Required: `true`

Sequence name

### start

* Type: `String | Number`
* Default: `1`
* Required: `false`

Start value

### min

* Type: `String | Number`
* Default: `1`
* Required: `false`

Minimum value

### max

* Type: `String | Number`
* Default: `9223372036854775807`
* Required: `false`

Maximum value

### cycle

* Type: `Boolean`
* Default: `false`
* Required: `false`

Sequence looping when max value is reached

### increment

* Type: `String | Number`
* Default: `1`
* Required: `false`

Determines which number will be added to the current value of the sequence

### force

* Type: `Boolean`
* Default: `false`
* Required: `false`

Force sync of sequence (drop and create)

