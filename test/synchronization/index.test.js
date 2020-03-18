'use strict';

const common = require('./common');

const roles = {
  name: 'DifferSchema.roles',
  columns: { id: 'bigint' },
  indexes: [{ columns: ['id'] }],
};

common.describeIndexOrConstraintTest(
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
