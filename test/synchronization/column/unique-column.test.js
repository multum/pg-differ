'use strict';

const helpers = require('../../helpers');

describe('unique column', () => {
  let differ;
  beforeEach(() => {
    differ = helpers.getDiffer();
  });

  it('should add the unique constraint', async function () {
    differ.define('table', {
      name: 'DifferSchema.users',
      columns: { id: 'int' },
    });
    await differ.sync({ force: true });
    differ.define('table', {
      name: 'DifferSchema.users',
      columns: { id: { type: 'int', unique: true } },
    });
    expect(await differ.sync()).toMatchObject({
      queries: ['alter table "DifferSchema"."users" add unique ( "id" );'],
    });
    expect(await differ.sync({ execute: false })).toMatchObject({
      queries: [],
    });
  });
});
