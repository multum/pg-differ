'use strict';

const helpers = require('../helpers');

describe('unique constraint', () => {
  const tableProperties = {
    name: 'DifferSchema.roles',
    columns: [
      { name: 'id', type: 'bigint' },
      { name: 'type', type: 'smallint' },
    ],
  };

  it('should create a table with a unique constraint', function() {
    return helpers.alterObject('table', {
      properties: {
        ...tableProperties,
        unique: [{ columns: ['id'] }],
      },
      syncOptions: { force: true },
      expectQueries: [
        `drop table if exists "DifferSchema"."roles" cascade;`,
        `create table "DifferSchema"."roles" ( "id" bigint null, "type" smallint null );`,
        `alter table "DifferSchema"."roles" add UNIQUE ("id");`,
      ],
    });
  });

  it('should create a new primary key for an existing table', function() {
    return helpers.alterObject(
      'table',
      {
        properties: {
          ...tableProperties,
          unique: [{ columns: ['id'] }],
        },
        ignoreResultCheck: true,
        syncOptions: { force: true },
      },
      {
        properties: {
          ...tableProperties,
          unique: [{ columns: ['id', 'type'] }],
        },
        syncOptions: { cleanable: { unique: true } },
        expectQueries: [
          `alter table "DifferSchema"."roles" drop constraint "roles_id_key";`,
          `alter table "DifferSchema"."roles" add UNIQUE ("id", "type");`,
        ],
      }
    );
  });
});
