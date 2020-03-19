'use strict';
const helpers = require('../helpers');

const properties = {
  name: `DifferSchema.users_seq`,
  min: 0,
  start: 0,
  max: 10000,
  increment: 10,
  cycle: false,
};

const createQuery =
  'create sequence "DifferSchema"."users_seq"' +
  ' start 0 increment 10 no cycle maxvalue 10000 minvalue 0';

describe(`sequence`, () => {
  const utils = helpers.getUtils();

  beforeAll(() => {
    return utils.client.query(
      'drop sequence if exists "DifferSchema"."users_seq" cascade;'
    );
  });

  it(`should create a sequence`, async function() {
    const differ = helpers.createInstance();
    differ.define('sequence', properties);
    await helpers.expectSyncResult(differ.sync(), [createQuery]);
    return helpers.expectSyncResult(differ.sync(), []);
  });

  it(`should force create a sequence`, async function() {
    const differ = helpers.createInstance();
    differ.define('sequence', properties);
    await helpers.expectSyncResult(differ.sync({ force: true }), [
      'drop sequence if exists "DifferSchema"."users_seq" cascade;',
      createQuery,
    ]);
    return helpers.expectSyncResult(differ.sync(), []);
  });

  it(`should update the sequence`, async function() {
    const differ = helpers.createInstance();
    differ.define('sequence', properties);
    await differ.sync({ force: true });

    differ.define('sequence', {
      ...properties,
      max: 10010,
      increment: 10,
      cycle: true,
    });
    return helpers.expectSyncResult(differ.sync(), [
      'alter sequence "DifferSchema"."users_seq" cycle maxvalue 10010',
    ]);
  });

  it(`should get an error making incorrect changes`, async function() {
    const differ = helpers.createInstance();
    differ.define('sequence', properties);
    await differ.sync({ force: true });

    differ.define('sequence', { ...properties, max: 10 });
    return expect(differ.sync()).rejects.toThrow(
      `You cannot increase 'min' value or decrease 'max'`
    );
  });
});
