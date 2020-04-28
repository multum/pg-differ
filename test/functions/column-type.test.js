'use strict';
const Types = require('../../lib/types');

describe(`parse column type`, () => {
  it.each([
    [
      'numeric (16, 4)',
      { pure: 'numeric(16,4)', name: 'numeric', arguments: [16, 4] },
    ],
    [
      'varchar ( 255 )',
      {
        pure: 'character varying(255)',
        name: 'character varying',
        arguments: [255],
      },
    ],
    [
      'timestamp (2) with time zone',
      {
        pure: 'timestamp(2) with time zone',
        name: 'timestamp with time zone',
        arguments: [2],
      },
    ],
    [
      'timestamptz(2)',
      {
        pure: 'timestamp(2) with time zone',
        name: 'timestamp with time zone',
        arguments: [2],
      },
    ],
    [
      'time (2) with time zone',
      {
        pure: 'time(2) with time zone',
        name: 'time with time zone',
        arguments: [2],
      },
    ],
    [
      'timetz(2)',
      {
        pure: 'time(2) with time zone',
        name: 'time with time zone',
        arguments: [2],
      },
    ],
    [
      'time(2)',
      {
        pure: 'time(2) without time zone',
        name: 'time without time zone',
        arguments: [2],
      },
    ],
    [
      'int8',
      {
        pure: 'bigint',
        name: 'bigint',
        arguments: [],
      },
    ],
    [
      'varchar(255)[]',
      {
        pure: 'character varying(255)[]',
        name: 'character varying',
        arguments: [255],
        dimensions: 1,
      },
    ],
    [
      'timetz(5)[][]',
      {
        pure: 'time(5) with time zone[][]',
        name: 'time with time zone',
        arguments: [5],
        dimensions: 2,
      },
    ],
    [
      'custom_type( varchar(16), 64 )',
      {
        pure: 'custom_type(varchar(16),64)',
        name: 'custom_type',
        arguments: ['varchar(16)', 64],
      },
    ],
  ])('should parse "%s"', (type, expected) => {
    expect(Types.parse(type)).toEqual(expected);
  });
});
