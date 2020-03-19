'use strict';

const helpers = require('../../helpers');

describe('new column', () => {
  it('should add the new column', function() {
    const properties = { columns: { id: 'int' } };
    return helpers.alterObject(
      'table',
      {
        properties,
        syncOptions: { force: true },
        ignoreResultCheck: true,
      },
      {
        properties: {
          columns: {
            ...properties.columns,
            body: 'json',
          },
        },
        expectQueries: ['alter table [table] add column "body" json null;'],
      }
    );
  });
});
