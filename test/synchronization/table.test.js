'use strict';

const helpers = require('../helpers');

describe('table', () => {
  const utils = helpers.getUtils();

  beforeAll(() => {
    return utils.client.query(
      `drop table if exists "DifferSchema"."users" cascade;`
    );
  });

  it('should add the new table', function() {
    return helpers.alterObject('table', {
      properties: {
        name: 'DifferSchema.users',
        columns: { id: 'bigint' },
      },
      expectQueries: ['create table [table] ( "id" bigint null );'],
    });
  });
});
