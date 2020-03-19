'use strict';

const helpers = require('../../helpers');

describe('rename column', () => {
  it('should rename the column and change its type', function() {
    return helpers.alterObject(
      'table',
      {
        properties: { columns: { id: 'int' } },
        syncOptions: { force: true },
        ignoreResultCheck: true,
      },
      {
        properties: {
          columns: {
            largeID: { type: 'bigint', formerNames: ['id'] },
          },
        },
        expectQueries: [
          'alter table "DifferSchema"."users" rename column "id" to "largeID";',
          'alter table "DifferSchema"."users" alter column "largeID" type bigint;',
        ],
      }
    );
  });
});
