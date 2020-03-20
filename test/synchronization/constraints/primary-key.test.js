'use strict';

const helpers = require('../../helpers');

const roles = {
  name: 'DifferSchema.roles',
  columns: {
    id: 'bigint',
    type: 'smallint',
  },
  primaryKey: { columns: ['id'] },
};

helpers.describeIndexOrConstraintTest(
  'primaryKeys',
  {
    properties: [roles],
    expectQueries: [
      'alter table "DifferSchema"."roles" alter column "id" set not null;',
      `alter table "DifferSchema"."roles" add PRIMARY KEY ( "id" );`,
    ],
  },
  {
    properties: [{ ...roles, primaryKey: { columns: ['id', 'type'] } }],
    expectQueries: [
      'alter table "DifferSchema"."roles" drop constraint "roles_pkey";',
      'alter table "DifferSchema"."roles" alter column "type" set not null;',
      'alter table "DifferSchema"."roles" add PRIMARY KEY ( "id", "type" );',
    ],
  }
);
