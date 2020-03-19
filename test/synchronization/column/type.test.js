'use strict';

const helpers = require('../../helpers');
const expectedSimpleAlterQuery = [
  'alter table [table] alter column [column] type [type];',
];

describe('alter column type', () => {
  helpers.alterColumnType('numeric(16,2)').to({
    types: ['numeric(16,4)', 'numeric(16, 1)'],
    expectQuery: expectedSimpleAlterQuery,
  });

  helpers.alterColumnType('smallint').to({
    types: ['integer', 'bigint', 'real', 'double precision'],
    expectQuery: expectedSimpleAlterQuery,
  });

  helpers.alterColumnType('integer').to({
    types: ['bigint', 'real', 'double precision'],
    expectQuery: expectedSimpleAlterQuery,
  });

  helpers.alterColumnType('bigint').to({
    types: ['real', 'double precision'],
    expectQuery: expectedSimpleAlterQuery,
  });

  helpers.alterColumnType('real').to({
    types: ['double precision'],
    expectQuery: expectedSimpleAlterQuery,
  });

  helpers.alterColumnType('character varying(64)').to({
    types: [
      'character varying(255)',
      'character(64)',
      'character(255)',
      'text',
    ],
    expectQuery: expectedSimpleAlterQuery,
  });

  helpers.alterColumnType('character(64)').to({
    types: [
      'character(255)',
      'character varying(64)',
      'character varying(255)',
      'text',
    ],
    expectQuery: expectedSimpleAlterQuery,
  });

  helpers.alterColumnType('timestamp').to({
    types: ['timestamptz', 'timestamptz(5)', 'timestamp(5)'],
    expectQuery: expectedSimpleAlterQuery,
  });

  helpers.alterColumnType('timestamptz').to({
    types: ['timestamptz(5)', 'timestamp', 'timestamp(5)'],
    expectQuery: expectedSimpleAlterQuery,
  });

  helpers.alterColumnType('time').to({
    types: ['timez', 'time(2)'],
    expectQuery: expectedSimpleAlterQuery,
  });

  helpers.alterColumnType('timez').to({
    types: ['time', 'time(2)', 'timez(2)'],
    expectQuery: expectedSimpleAlterQuery,
  });
});
