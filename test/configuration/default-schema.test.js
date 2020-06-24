'use strict';

const helpers = require('../helpers');

describe(`default schema`, () => {
  it(`should change using config property`, function () {
    const differ = helpers.getDiffer({ defaultSchema: 'DifferSchema' });
    const users = differ.define('table', {
      name: 'users',
      columns: { id: 'int' },
    });
    expect(users.getObjectName()).toEqual('DifferSchema.users');
  });

  it(`should change using differ.setDefaultSchema() method`, function () {
    const differ = helpers.getDiffer();
    const users = differ.define('table', {
      name: 'users',
      columns: { id: 'int' },
    });

    expect(differ.getDefaultSchema()).toEqual('public');

    differ.setDefaultSchema('DifferSchema');

    expect(differ.getDefaultSchema()).toEqual('DifferSchema');
    expect(users.getObjectName()).toEqual('DifferSchema.users');
    expect(users.getQuotedObjectName()).toEqual('"DifferSchema"."users"');
  });
});
