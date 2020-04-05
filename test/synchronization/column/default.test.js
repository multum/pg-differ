'use strict';

const helpers = require('../../helpers');

describe('column.default', () => {
  let differ;
  beforeEach(() => {
    differ = helpers.getDiffer();
  });

  it('set the Literal as the default value', async function () {
    differ.define('table', {
      name: 'DifferSchema.users',
      columns: { birthday: 'date' },
    });
    await differ.sync({ force: true });

    differ.define('table', {
      name: 'DifferSchema.users',
      columns: {
        birthday: { type: 'date', default: ['literal', 'now()'] },
      },
    });

    expect(await differ.sync()).toMatchObject({
      queries: [
        `alter table "DifferSchema"."users" alter column "birthday" set default now();`,
      ],
    });
    expect(await differ.sync({ execute: false })).toMatchObject({
      queries: [],
    });
  });

  it('set the JSON as the default value', async function () {
    differ.define('table', {
      name: 'DifferSchema.users',
      columns: { birthday: 'json' },
    });
    await differ.sync({ force: true });

    differ.define('table', {
      name: 'DifferSchema.users',
      columns: {
        birthday: {
          type: 'json',
          default: ['json', { year: 1990, month: 7, day: 6 }],
        },
      },
    });

    expect(await differ.sync()).toMatchObject({
      queries: [
        `alter table "DifferSchema"."users" alter column "birthday" set default '{"year":1990,"month":7,"day":6}';`,
      ],
    });
    expect(await differ.sync({ execute: false })).toMatchObject({
      queries: [],
    });
  });

  it('remove unnecessary default value', async function () {
    differ.define('table', {
      name: 'DifferSchema.users',
      columns: {
        birthday: { type: 'timestamp', default: ['literal', 'now()'] },
      },
    });
    await differ.sync({ force: true });

    differ.define('table', {
      name: 'DifferSchema.users',
      columns: { birthday: 'timestamp' },
    });

    expect(await differ.sync()).toMatchObject({
      queries: [
        'alter table "DifferSchema"."users" alter column "birthday" drop default;',
      ],
    });
    expect(await differ.sync({ execute: false })).toMatchObject({
      queries: [],
    });
  });

  it('set nextval() as default value', async function () {
    differ.define('sequence', { name: 'DifferSchema.users_seq' });
    differ.define('table', {
      name: 'DifferSchema.users',
      columns: {
        id: {
          type: 'integer',
          default: ['literal', `nextval('DifferSchema.users_seq'::regclass)`],
        },
      },
    });
    expect(await differ.sync({ force: true })).toMatchObject({
      queries: [
        'drop sequence if exists "DifferSchema"."users_seq" cascade;',
        'create sequence "DifferSchema"."users_seq";',
        'drop table if exists "DifferSchema"."users" cascade;',
        'create table "DifferSchema"."users" ( "id" integer default nextval(\'"DifferSchema"."users_seq"\'::regclass) null );',
      ],
    });

    expect(await differ.sync({ execute: false })).toMatchObject({
      queries: [],
    });
  });
});
