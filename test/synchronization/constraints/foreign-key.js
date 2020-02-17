'use strict';

const common = require('../common');

const roles = {
  name: 'DifferSchema.roles',
  columns: {
    id: 'bigint',
    type: 'smallint',
  },
  unique: [{ columns: ['id'] }],
};

const users = {
  name: 'DifferSchema.users',
  columns: { role: 'bigint' },
  foreignKeys: [
    {
      columns: ['role'],
      references: {
        table: 'DifferSchema.roles',
        columns: ['id'],
      },
    },
  ],
};

common.describeIndexOrConstraintTest(
  'foreignKeys',
  {
    properties: [roles, users],
    expectQueries: [
      `alter table "DifferSchema"."roles" add UNIQUE ( "id" );`,
      `alter table "DifferSchema"."users" add FOREIGN KEY ( "role" ) references "DifferSchema"."roles" ( "id" ) match SIMPLE on update NO ACTION on delete NO ACTION;`,
    ],
  },
  {
    properties: [{ ...users, foreignKeys: [] }],
    expectQueries: [
      `alter table "DifferSchema"."users" drop constraint "users_role_fkey";`,
    ],
  }
);
