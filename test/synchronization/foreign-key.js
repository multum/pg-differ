'use strict';

const helpers = require('../helpers');

describe('foreign key', async () => {
  it('should create a table with a foreign key', async function() {
    const differ = helpers.createInstance();
    differ.define('table', {
      name: 'DifferSchema.roles',
      columns: [{ name: 'id', type: 'bigint' }],
      unique: [{ columns: ['id'] }],
    });
    differ.define('table', {
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
    });

    await helpers.expectSyncResult(differ.sync({ force: true }), [
      `drop table if exists "DifferSchema"."roles" cascade;`,
      `create table "DifferSchema"."roles" ( "id" bigint null );`,

      `drop table if exists "DifferSchema"."users" cascade;`,
      `create table "DifferSchema"."users" ( "role" bigint null );`,

      `alter table "DifferSchema"."roles" add UNIQUE ("id");`,
      `alter table "DifferSchema"."users" add FOREIGN KEY ("role") references "DifferSchema"."roles" ("id") match SIMPLE on update NO ACTION on delete NO ACTION;`,
    ]);

    return helpers.expectSyncResult(differ.sync(), []);
  });
});
