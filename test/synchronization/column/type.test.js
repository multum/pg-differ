'use strict';

const helpers = require('../../helpers');
const parser = require('../../../lib/parser');

describe('alter column type', () => {
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
  ].forEach(({ from: prevType, to: types, forbidden }) => {
    const differ = helpers.createInstance();

    const table = 'DifferSchema.users';
    const column = 'birthday';

    types.forEach(type => {
      it(`${prevType} --> ${type}`, async function() {
        const model = differ.define('table', {
          name: table,
          columns: { [column]: prevType },
        });

        const normalizedPrevType = parser.dataType(prevType).raw;
        await helpers.expectSyncResult(differ.sync({ force: true }), [
          `drop table if exists ${model.getQuotedFullName()} cascade;`,
          `create table ${model.getQuotedFullName()} ( "${column}" ${normalizedPrevType} null );`,
        ]);

        const normalizedType = parser.dataType(type).raw;

        differ.define('table', {
          name: table,
          columns: { [column]: normalizedType },
        });

        if (forbidden) {
          await expect(differ.sync({ execute: false })).rejects.toThrow(
            `Change the column type from '${normalizedPrevType}' to '${normalizedType}' can result in data loss`
          );
        } else {
          await helpers.expectSyncResult(differ.sync(), [
            `alter table "DifferSchema"."users" alter column "birthday" type ${normalizedType};`,
          ]);

          return helpers.expectSyncResult(differ.sync({ execute: false }), []);
        }
      });
    });
  });
});
