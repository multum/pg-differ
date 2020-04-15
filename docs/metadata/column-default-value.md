# Column default value

Values for the `[column].default` should be as follows:

- Primitive data types
  - `'Default string'`
  - `1`
  - `true`
  - `null`
- JSON types
  - `{ type: 'json', value: [...] | {...} }`
  - `[ 'json', [...] | {...} ]`
- SQL literal
  - `{ type: 'literal', value: 'now()' }`
  - `[ 'literal', 'now()' ]`
