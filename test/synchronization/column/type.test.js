'use strict';

const helpers = require('../../helpers');
const expectedSimpleAlterQuery = [
  'alter table [table] alter column [column] type [type];',
];

describe('alter column type', () => {
  helpers
    .alterColumnType({
      column: 'birthday',
      type: 'numeric(16,2)',
    })
    .to({
      types: ['numeric(16,4)', 'numeric(16, 1)'],
      expectQuery: expectedSimpleAlterQuery,
    });

  helpers
    .alterColumnType({
      column: 'birthday',
      type: 'smallint',
    })
    .to({
      types: ['integer', 'bigint', 'real', 'double precision'],
      expectQuery: expectedSimpleAlterQuery,
    });

  helpers
    .alterColumnType({
      column: 'birthday',
      type: 'integer',
    })
    .to({
      types: ['bigint', 'real', 'double precision'],
      expectQuery: expectedSimpleAlterQuery,
    });

  helpers
    .alterColumnType({
      column: 'birthday',
      type: 'bigint',
    })
    .to({
      types: ['real', 'double precision'],
      expectQuery: expectedSimpleAlterQuery,
    });

  helpers
    .alterColumnType({
      column: 'birthday',
      type: 'real',
    })
    .to({
      types: ['double precision'],
      expectQuery: expectedSimpleAlterQuery,
    });

  helpers
    .alterColumnType({
      column: 'birthday',
      type: 'character varying(64)',
    })
    .to({
      types: ['character varying(255)', 'character(64)', 'character(255)'],
      expectQuery: expectedSimpleAlterQuery,
    });

  helpers
    .alterColumnType({
      column: 'birthday',
      type: 'character(64)',
    })
    .to({
      types: [
        'character(255)',
        'character varying(64)',
        'character varying(255)',
      ],
      expectQuery: expectedSimpleAlterQuery,
    });

  helpers
    .alterColumnType({
      column: 'birthday',
      type: 'timestamp',
    })
    .to({
      types: ['timestamptz', 'timestamp(5)'],
      expectQuery: expectedSimpleAlterQuery,
    });

  helpers
    .alterColumnType({
      column: 'birthday',
      type: 'time',
    })
    .to({
      types: ['timez', 'time(2)'],
      expectQuery: expectedSimpleAlterQuery,
    });
});
