'use strict';

const helpers = require('../helpers');

describe('table', () => {
  const connection = helpers.getConnection();
  let differ;

  beforeEach(() => {
    differ = helpers.getDiffer();
  });

  beforeAll(() => {
    return connection.client.query(
      `drop table if exists "DifferSchema"."users" cascade;`
    );
  });

  it('should add the new table', async function () {
    differ.define('table', {
      name: 'DifferSchema.users',
      columns: { id: 'bigint' },
    });

    expect(await differ.sync()).toMatchObject({
      queries: ['create table "DifferSchema"."users" ( "id" bigint null );'],
    });
  });
});
