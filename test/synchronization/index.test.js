'use strict';

require('./test-factories').indexOrConstraintTest('indexes', {
  properties: [
    {
      name: 'DifferSchema.users',
      columns: { id: 'bigint' },
      indexes: [{ columns: ['id'] }],
    },
  ],
  expectQueries: [`create index on "DifferSchema"."users" ( "id" );`],
  expectDropQueries: [`drop index "DifferSchema"."users_id_idx";`],
});
