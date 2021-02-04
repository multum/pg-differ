'use strict';

const Types = require('../../../lib/types');
const helpers = require('../../helpers');

describe('column.type', () => {
  let differ;
  beforeEach(() => {
    differ = helpers.getDiffer();
  });

  [
    {
      from: 'numeric(16,2)',
      to: ['numeric(16,4)', 'numeric(16,1)'],
    },
    {
      from: 'smallint',
      to: ['integer', 'bigint', 'real', 'double precision'],
    },
    {
      from: 'integer',
      to: ['bigint', 'real', 'double precision'],
    },
    {
      from: 'bigint',
      to: ['real', 'double precision'],
    },
    {
      from: 'real',
      to: ['double precision'],
    },
    {
      from: 'character varying(64)',
      to: ['character varying(255)', 'character(64)', 'character(255)', 'text'],
    },
    {
      from: 'character(64)',
      to: [
        'character(255)',
        'character varying(64)',
        'character varying(255)',
        'text',
      ],
    },
    {
      from: 'timestamp',
      to: ['timestamptz', 'timestamptz(5)', 'timestamp(5)'],
    },
    {
      from: 'timestamptz',
      to: ['timestamptz(5)', 'timestamp', 'timestamp(5)'],
    },
    {
      from: 'time',
      to: ['timetz', 'time(2)'],
    },
    {
      from: 'timetz',
      to: ['time', 'time(2)', 'timetz(2)'],
    },
    {
      from: 'numeric(16)[]',
      to: ['numeric(24)[]'],
    },
    {
      from: 'numeric(24)',
      to: ['numeric(16)'],
      forbidden: true,
    },
    {
      from: 'numeric(24)[]',
      to: ['numeric(24)[][]'],
      forbidden: true,
    },
    {
      from: 'json',
      to: ['jsonb'],
    },
  ].forEach(({ from: prevType, to: types, forbidden }) => {
    const table = 'DifferSchema.users';
    const column = 'birthday';

    types.forEach((type) => {
      it(`${prevType} --> ${type}`, async function () {
        differ.define('table', {
          name: table,
          columns: { [column]: prevType },
        });

        const purePrevType = Types.parse(prevType).pure;
        expect(await differ.sync({ force: true })).toMatchObject({
          queries: [
            `drop table if exists "DifferSchema"."users" cascade;`,
            `create table "DifferSchema"."users" ( "${column}" ${purePrevType} null );`,
          ],
        });

        const pureType = Types.parse(type).pure;

        differ.define('table', {
          name: table,
          columns: { [column]: pureType },
        });

        if (forbidden) {
          await expect(differ.sync({ execute: false })).rejects.toThrow(
            `Change the column type from '${purePrevType}' to '${pureType}' can result in data loss`
          );
        } else {
          expect(await differ.sync()).toMatchObject({
            queries: [
              `alter table "DifferSchema"."users" alter column "birthday" type ${pureType};`,
            ],
          });
          expect(await differ.sync({ execute: false })).toMatchObject({
            queries: [],
          });
        }
      });
    });
  });
});
