'use strict';

const TestFactories = require('../test-factories');

TestFactories.indexOrConstraintTest('primaryKeys', {
  properties: [
    {
      name: 'DifferSchema.users',
      columns: { id: 'bigint', age: 'smallint' },
      primaryKey: { columns: ['id'] },
    },
  ],
  expectQueries: [
    'alter table "DifferSchema"."users" alter column "id" set not null;',
    `alter table "DifferSchema"."users" add primary key ( "id" );`,
  ],
  expectDropQueries: [
    'alter table "DifferSchema"."users" drop constraint "users_pkey";',
    'alter table "DifferSchema"."users" alter column "id" drop not null;',
  ],
});
