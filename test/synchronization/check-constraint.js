'use strict';

const helpers = require('../helpers');

describe('check constraint', () => {
  const condition = 'id > 10 AND id < 1000';
  const properties = {
    name: 'DifferSchema.roles',
    columns: [{ name: 'id', type: 'bigint' }],
    checks: [{ condition }],
  };
  it('should create a table with a check constraint', function() {
    return helpers.alterObject('table', {
      properties,
      syncOptions: { force: true },
      expectQueries: [
        `drop table if exists "DifferSchema"."roles" cascade;`,
        `create table "DifferSchema"."roles" ( "id" bigint null );`,
        `alter table "DifferSchema"."roles" add CHECK (${condition});`,
      ],
    });
  });

  it('should drop unnecessary check constraint', function() {
    return helpers.alterObject(
      'table',
      {
        properties,
        syncOptions: { force: true },
        ignoreResultCheck: true,
      },
      {
        properties: { ...properties, checks: [] },
        expectQueries: [
          `alter table "DifferSchema"."roles" drop constraint "roles_id_check";`,
        ],
        syncOptions: { cleanable: { checks: true } },
      }
    );
  });
});
