# Sequence

## Usage example {docsify-ignore}

```javascript
const differ = new Differ();
differ.define('sequence', properties);
differ.sync().then(() => console.log('database ready'));
```

## Properties {docsify-ignore}

### name

- Type: `String`
- Default: `null`
- Required: `true`

Sequence name

### start

- Type: `String | Number`
- Default: `1`
- Required: `false`

Start value

### min

- Type: `String | Number`
- Default: `1`
- Required: `false`

Minimum value

### max

- Type: `String | Number`
- Default: `9223372036854775807`
- Required: `false`

Maximum value

### cycle

- Type: `Boolean`
- Default: `false`
- Required: `false`

Sequence looping when max value is reached

### increment

- Type: `String | Number`
- Default: `1`
- Required: `false`

Determines which number will be added to the current value of the sequence
