'use strict';

const common = require('../common');

const roles = {
  name: 'DifferSchema.roles',
  columns: [
    { name: 'id', type: 'bigint' },
    { name: 'type', type: 'smallint' },
  ],
  primaryKey: { columns: ['id'] },
};

common.describeIndexOrConstraintTest(
  'primaryKeys',
  {
    properties: [roles],
    expectQueries: [
      `alter table "DifferSchema"."roles" add PRIMARY KEY ( "id" );`,
    ],
  },
  {
    properties: [{ ...roles, primaryKey: { columns: ['id', 'type'] } }],
    expectQueries: [
      `alter table "DifferSchema"."roles" drop constraint "roles_pkey";`,
      `alter table "DifferSchema"."roles" add PRIMARY KEY ( "id", "type" );`,
    ],
  }
);
