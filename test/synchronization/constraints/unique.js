'use strict';

const common = require('../common');

const roles = {
  name: 'DifferSchema.roles',
  columns: [
    { name: 'id', type: 'bigint' },
    { name: 'type', type: 'smallint' },
  ],
  unique: [{ columns: ['id'] }],
};

common.describeIndexOrConstraintTest(
  'unique',
  {
    properties: [roles],
    expectQueries: [`alter table "DifferSchema"."roles" add UNIQUE ( "id" );`],
  },
  {
    properties: [{ ...roles, unique: [{ columns: ['id', 'type'] }] }],
    expectQueries: [
      `alter table "DifferSchema"."roles" drop constraint "roles_id_key";`,
      `alter table "DifferSchema"."roles" add UNIQUE ( "id", "type" );`,
    ],
  }
);
