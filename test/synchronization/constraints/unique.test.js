'use strict';

const common = require('../common');

const roles = {
  name: 'DifferSchema.roles',
  columns: { id: 'bigint', type: 'smallint' },
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
