'use strict';

const helpers = require('../../helpers');

describe('column.collate', () => {
  let differ;
  beforeEach(() => {
    differ = helpers.getDiffer();
  });

  it('should create table with column.collate', async function () {
    differ.define('table', {
      name: 'DifferSchema.users',
      columns: { id: { type: 'text', collate: 'C' } },
    });
    expect(await differ.sync({ force: true })).toMatchObject({
      queries: [
        'drop table if exists "DifferSchema"."users" cascade;',
        'create table "DifferSchema"."users" ( "id" text collate "C" null );',
      ],
    });
  });

  it('should add column.collate', async function () {
    differ.define('table', {
      name: 'DifferSchema.users',
      columns: { id: 'text' },
    });
    await differ.sync({ force: true });
    differ.define('table', {
      name: 'DifferSchema.users',
      columns: { id: { type: 'text', collate: 'C' } },
    });
    expect(await differ.sync()).toMatchObject({
      queries: [
        'alter table "DifferSchema"."users" alter column "id" type text collate "C";',
      ],
    });
  });

  it('should remove column.collate', async function () {
    differ.define('table', {
      name: 'DifferSchema.users',
      columns: { id: { type: 'text', collate: 'C' } },
    });
    await differ.sync({ force: true });
    differ.define('table', {
      name: 'DifferSchema.users',
      columns: { id: 'text' },
    });
    expect(await differ.sync()).toMatchObject({
      queries: [
        'alter table "DifferSchema"."users" alter column "id" type text;',
      ],
    });
  });
});
