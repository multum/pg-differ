'use strict';

const helpers = require('../../helpers');

describe('new column', () => {
  let differ;
  beforeEach(() => {
    differ = helpers.getDiffer();
  });

  it('should add the new column', async function () {
    const columns = { id: 'int' };
    differ.define('table', {
      name: 'DifferSchema.users',
      columns,
    });
    await differ.sync({ force: true });

    differ.define('table', {
      name: 'DifferSchema.users',
      columns: { ...columns, body: 'json' },
    });

    expect(await differ.sync()).toMatchObject({
      queries: [
        'alter table "DifferSchema"."users" add column "body" json null;',
      ],
    });
    expect(await differ.sync({ execute: false })).toMatchObject({
      queries: [],
    });
  });
});
