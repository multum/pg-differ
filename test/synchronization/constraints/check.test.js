'use strict';

require('../test-factories').indexOrConstraintTest('checks', {
  properties: [
    {
      name: 'DifferSchema.roles',
      columns: { id: 'bigint' },
      checks: [{ condition: 'id>10 AND id<1000' }], // condition will be normalized
    },
  ],
  expectQueries: [
    `alter table "DifferSchema"."roles" add check ( id > 10 AND id < 1000 );`,
  ],
  expectDropQueries: [
    `alter table "DifferSchema"."roles" drop constraint "roles_id_check";`,
  ],
});
