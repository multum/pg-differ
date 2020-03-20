'use strict';
const helpers = require('../helpers');

describe(`method differ.setDefaultSchema()`, () => {
  it(`should change default schema`, function() {
    const differ = helpers.createInstance();
    differ.define('table', { name: 'users', columns: { id: 'int' } });

    const users = differ.objects.get('users');

    expect(differ.defaultSchema).toEqual('public');
    expect(users.getFullName()).toEqual('public.users');
    expect(users.getQuotedFullName()).toEqual('"public"."users"');

    differ.setDefaultSchema('DifferSchema');

    expect(differ.defaultSchema).toEqual('DifferSchema');
    expect(users.getFullName()).toEqual('DifferSchema.users');
    expect(users.getQuotedFullName()).toEqual('"DifferSchema"."users"');
  });
});
