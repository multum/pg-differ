'use strict';

const helpers = require('../helpers');

describe('default value of the column', () => {
  it('should set the Literal as the default value', function() {
    return helpers.alterObject(
      'table',
      {
        properties: {
          name: 'DifferSchema.users',
          columns: [{ name: 'birthday', type: 'date' }],
        },
        syncOptions: { force: true },
        ignoreResultCheck: true,
      },
      {
        properties: {
          name: 'DifferSchema.users',
          columns: [
            { name: 'birthday', type: 'date', default: ['literal', 'now()'] },
          ],
        },
        expectQueries: [
          `alter table "DifferSchema"."users" alter column "birthday" set default now();`,
        ],
      }
    );
  });

  it('should set the JSON as the default value', function() {
    return helpers.alterObject(
      'table',
      {
        properties: {
          name: 'DifferSchema.users',
          columns: [{ name: 'birthday', type: 'json' }],
        },
        ignoreResultCheck: true,
        syncOptions: { force: true },
      },
      {
        properties: {
          name: 'DifferSchema.users',
          columns: [
            {
              name: 'birthday',
              type: 'json',
              default: ['json', { year: 1990, month: 7, day: 6 }],
            },
          ],
        },
        expectQueries: [
          `alter table "DifferSchema"."users" alter column "birthday" set default '{"year":1990,"month":7,"day":6}';`,
        ],
      }
    );
  });
});
