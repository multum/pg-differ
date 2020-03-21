'use strict';

const testFactories = require('../test-factories');

const condition = 'id > 10 AND id < 1000';

const roles = {
  name: 'DifferSchema.roles',
  columns: { id: 'bigint' },
  checks: [{ condition }],
};

testFactories.indexOrConstraintTest(
  'checks',
  {
    properties: [roles],
    expectQueries: [
      `alter table "DifferSchema"."roles" add CHECK ( ${condition} );`,
    ],
  },
  {
    properties: [{ ...roles, checks: [] }],
    expectQueries: [
      `alter table "DifferSchema"."roles" drop constraint "roles_id_check";`,
    ],
  }
);
