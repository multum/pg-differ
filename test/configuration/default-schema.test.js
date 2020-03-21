'use strict';

const helpers = require('../helpers');

describe(`method differ.setDefaultSchema()`, () => {
  it(`should change default schema`, function() {
    const differ = helpers.createInstance();
    differ.define('table', { name: 'users', columns: { id: 'int' } });

    const users = differ.objects.get('users');

    expect(differ.getDefaultSchema()).toEqual('public');
    expect(users.getObjectName()).toEqual('public.users');
    expect(users.getQuotedObjectName()).toEqual('"public"."users"');

    differ.setDefaultSchema('DifferSchema');

    expect(differ.getDefaultSchema()).toEqual('DifferSchema');
    expect(users.getObjectName()).toEqual('DifferSchema.users');
    expect(users.getQuotedObjectName()).toEqual('"DifferSchema"."users"');
  });
});
