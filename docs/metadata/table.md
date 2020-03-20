# Table

## Usage example {docsify-ignore}

```javascript
const differ = new Differ();
differ.define('table', properties);
differ.sync().then(() => console.log('database ready'));
```

## Properties {docsify-ignore}

### name

- Type: `String`
- Default: `null`
- Required: `true`

The name of the format table is `'schema_name.table_name'` or `'table_name'`

### [columns](metadata/column.md)

- Type: `Object<{[name]: Column}>`
- Default: `null`
- Required: `true`

### [primaryKey](metadata/primary-key.md)

- Type: `Object`
- Default: `null`
- Required: `false`

### [indexes](metadata/index.md)

- Type: `Object[]`
- Default: `null`
- Required: `false`

### [foreignKeys](metadata/foreign-key.md)

- Type: `Object[]`
- Default: `null`
- Required: `false`

### [unique](metadata/unique.md)

- Type: `Object[]`
- Default: `null`
- Required: `false`

### [checks](metadata/check.md)

- Type: `Object[]`
- Default: `null`
- Required: `false`
