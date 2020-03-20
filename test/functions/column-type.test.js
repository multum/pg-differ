'use strict';
const parser = require('../../lib/parser');

describe(`parse column type`, () => {
  it.each([
    [
      'numeric (16, 4)',
      { raw: 'numeric(16,4)', components: ['numeric', 16, 4] },
    ],
    [
      'varchar ( 255 )',
      {
        raw: 'character varying(255)',
        components: ['character varying', 255],
      },
    ],
    [
      'timestamp (2) with time zone',
      {
        raw: 'timestamp(2) with time zone',
        components: ['timestamp with time zone', 2],
      },
    ],
    [
      'timestamptz(2)',
      {
        raw: 'timestamp(2) with time zone',
        components: ['timestamp with time zone', 2],
      },
    ],
    [
      'time (2) with time zone',
      {
        raw: 'time(2) with time zone',
        components: ['time with time zone', 2],
      },
    ],
    [
      'timetz(2)',
      {
        raw: 'time(2) with time zone',
        components: ['time with time zone', 2],
      },
    ],
    [
      'time(2)',
      {
        raw: 'time(2) without time zone',
        components: ['time without time zone', 2],
      },
    ],
    [
      'int8',
      {
        raw: 'bigint',
        components: ['bigint'],
      },
    ],
    [
      'varchar(255)[]',
      {
        raw: 'character varying(255)[]',
        components: ['character varying', 255],
        dimensions: 1,
      },
    ],
    [
      'timetz(5)[][]',
      {
        raw: 'time(5) with time zone[][]',
        components: ['time with time zone', 5],
        dimensions: 2,
      },
    ],
  ])('should parse "%s"', (type, expected) => {
    expect(parser.dataType(type)).toEqual(expected);
  });
});
