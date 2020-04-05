'use strict';

require('../test-factories').indexOrConstraintTest('foreignKeys', {
  properties: [
    {
      name: 'DifferSchema.roles',
      columns: { id: 'bigint', type: 'smallint' },
      unique: [{ columns: ['id'] }],
    },
    {
      name: 'DifferSchema.users',
      columns: { role: 'bigint' },
      foreignKeys: [
        {
          columns: ['role'],
          references: { table: 'DifferSchema.roles', columns: ['id'] },
        },
      ],
    },
  ],
  expectQueries: [
    `alter table "DifferSchema"."roles" add unique ( "id" );`,
    `alter table "DifferSchema"."users" add foreign key ( "role" ) references "DifferSchema"."roles" ( "id" ) match SIMPLE on update NO ACTION on delete NO ACTION;`,
  ],
  expectDropQueries: [
    `alter table "DifferSchema"."users" drop constraint "users_role_fkey";`,
  ],
});
