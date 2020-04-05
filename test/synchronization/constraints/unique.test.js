'use strict';

require('../test-factories').indexOrConstraintTest('unique', {
  properties: [
    {
      name: 'DifferSchema.users',
      columns: { id: 'bigint', age: 'smallint' },
      unique: [{ columns: ['id'] }],
    },
  ],
  expectQueries: [`alter table "DifferSchema"."users" add unique ( "id" );`],
  expectDropQueries: [
    `alter table "DifferSchema"."users" drop constraint "users_id_key";`,
  ],
});
