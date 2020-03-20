'use strict';
const parser = require('../../lib/parser');

describe(`encode the default value of a column`, () => {
  it.each([
    [0, 0],
    [`some string`, `'some string'`],
    [`some 'string`, `'some ''string'`],
    [`some \\n string`, `E'some \\\\n string'`],
    [
      { type: 'literal', value: `nextval('users_seq'::regclass)` },
      `nextval('"public"."users_seq"'::regclass)`,
    ],
    [{ type: 'json', value: { a: 1, b: 2 } }, `'{"a":1,"b":2}'`],
    [['json', [1, `some 'string`]], `'[1,"some ''string"]'`],
  ])('should encode %O', (value, expected) => {
    expect(parser.encodeDefaultValue(value)).toEqual(expected);
  });
});
