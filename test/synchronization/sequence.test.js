'use strict';
const helpers = require('../helpers');

const properties = {
  name: `DifferSchema.users_seq`,
  min: 1,
  start: 1,
  max: 10000,
  increment: 10,
  cycle: false,
};

const createQuery =
  'create sequence "DifferSchema"."users_seq" increment 10 maxvalue 10000;';

describe(`sequence`, () => {
  const utils = helpers.getUtils();

  let differ;
  beforeEach(() => {
    differ = helpers.getDiffer();
  });

  beforeAll(() => {
    return utils.client.query(
      'drop sequence if exists "DifferSchema"."users_seq" cascade;'
    );
  });

  it(`should create a sequence`, async function () {
    differ.define('sequence', properties);
    expect(await differ.sync()).toMatchObject({
      queries: [createQuery],
    });
    expect(await differ.sync({ execute: false })).toMatchObject({
      queries: [],
    });
  });

  it(`should create a sequence without attributes`, async function () {
    differ.define('sequence', { name: properties.name });
    expect(await differ.sync({ force: true })).toMatchObject({
      queries: [
        'drop sequence if exists "DifferSchema"."users_seq" cascade;',
        'create sequence "DifferSchema"."users_seq";',
      ],
    });
    expect(await differ.sync({ execute: false })).toMatchObject({
      queries: [],
    });
  });

  it(`should force create a sequence`, async function () {
    differ.define('sequence', properties);
    expect(await differ.sync({ force: true })).toMatchObject({
      queries: [
        'drop sequence if exists "DifferSchema"."users_seq" cascade;',
        createQuery,
      ],
    });
    expect(await differ.sync({ execute: false })).toMatchObject({
      queries: [],
    });
  });

  it(`should update the sequence`, async function () {
    differ.define('sequence', properties);
    await differ.sync({ force: true });

    differ.define('sequence', {
      ...properties,
      max: 10010,
      increment: 10,
      cycle: true,
    });

    expect(await differ.sync()).toMatchObject({
      queries: [
        'alter sequence "DifferSchema"."users_seq" maxvalue 10010 cycle;',
      ],
    });
  });

  it(`should get an error making incorrect changes`, async function () {
    differ.define('sequence', properties);
    await differ.sync({ force: true });

    differ.define('sequence', { ...properties, max: 10 });
    await expect(differ.sync()).rejects.toThrow(
      `You cannot decrease 'max' value`
    );

    differ.define('sequence', { ...properties, min: 2 });
    await expect(differ.sync()).rejects.toThrow(
      `You cannot increase 'min' value`
    );
  });
});
