'use strict';

const helpers = require('../helpers');

describe('foreign key', () => {
  it('should create a table with a foreign key', function() {
    return helpers.alterObject('table', {
      properties: [
        {
          name: 'DifferSchema.roles',
          columns: [{ name: 'id', type: 'bigint' }],
          unique: [{ columns: ['id'] }],
        },
        {
          name: 'DifferSchema.users',
          columns: [{ name: 'role', type: 'bigint' }],
          foreignKeys: [
            {
              columns: ['role'],
              references: {
                table: 'DifferSchema.roles',
                columns: ['id'],
              },
            },
          ],
        },
      ],
      syncOptions: { force: true },
      expectQueries: [
        `drop table if exists "DifferSchema"."roles" cascade;`,
        `create table "DifferSchema"."roles" ( "id" bigint null );`,

        `drop table if exists "DifferSchema"."users" cascade;`,
        `create table "DifferSchema"."users" ( "role" bigint null );`,

        `alter table "DifferSchema"."roles" add UNIQUE ("id");`,
        `alter table "DifferSchema"."users" add FOREIGN KEY ("role") references "DifferSchema"."roles" ("id") match SIMPLE on update NO ACTION on delete NO ACTION;`,
      ],
    });
  });
});
