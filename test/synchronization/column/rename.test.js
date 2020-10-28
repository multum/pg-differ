'use strict';

const helpers = require('../../helpers');

describe('rename column', () => {
  let differ;
  beforeEach(() => {
    differ = helpers.getDiffer();
  });
  it('should rename the column and change its type', async function () {
    differ.define('table', {
      name: 'DifferSchema.users',
      columns: { id: 'int' },
    });
    await differ.sync({ force: true });

    differ.define('table', {
      name: 'DifferSchema.users',
      columns: { largeID: { type: 'bigint', formerNames: ['id'] } },
    });

    expect(await differ.sync()).toMatchObject({
      queries: [
        'alter table "DifferSchema"."users" rename column "id" to "largeID";',
        'alter table "DifferSchema"."users" alter column "largeID" type bigint;',
      ],
    });
    expect(await differ.sync({ execute: false })).toMatchObject({
      queries: [],
    });
  });
});
