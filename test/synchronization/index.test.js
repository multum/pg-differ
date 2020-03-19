'use strict';

const helpers = require('./../helpers');

const roles = {
  name: 'DifferSchema.roles',
  columns: { id: 'bigint' },
  indexes: [{ columns: ['id'] }],
};

helpers.describeIndexOrConstraintTest(
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
