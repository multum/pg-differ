'use strict';

require('./test-factories').indexOrConstraintTest('indexes', {
  properties: [
    {
      name: 'DifferSchema.users',
      columns: { id: 'bigint', birthday: 'int' },
      indexes: [{ using: 'hash', columns: ['birthday'] }, { columns: ['id'] }],
    },
  ],
  expectQueries: [
    `create index on "DifferSchema"."users" using hash ( "birthday" );`,
    `create index on "DifferSchema"."users" ( "id" );`,
  ],
  expectDropQueries: [
    // sorted by name
    `drop index "DifferSchema"."users_birthday_idx";`,
    `drop index "DifferSchema"."users_id_idx";`,
  ],
});
