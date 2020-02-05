# Column value definitions

Values for the `default` value of the column should be the following:

- primitive data types - `'Default string' | 1 | true | null`
- json types - `{ type: 'json', value: [...] | {...} }`
- SQL literal - `{ type: 'literal', value: 'now()' }`
