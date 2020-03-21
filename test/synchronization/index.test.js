'use strict';

const testFactories = require('./test-factories');

const roles = {
  name: 'DifferSchema.roles',
  columns: { id: 'bigint' },
  indexes: [{ columns: ['id'] }],
};

testFactories.indexOrConstraintTest(
  'indexes',
  {
    properties: [roles],
    expectQueries: [`create INDEX on "DifferSchema"."roles" ( "id" );`],
  },
  {
    properties: [{ ...roles, indexes: [] }],
    expectQueries: [`drop index "DifferSchema"."roles_id_idx";`],
  }
);
