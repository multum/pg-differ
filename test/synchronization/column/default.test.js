'use strict';

const helpers = require('../../helpers');

describe('default value of the column', () => {
  it('should set the Literal as the default value', function () {
    return helpers.alterObject(
      'table',
      {
        properties: {
          columns: { birthday: 'date' },
        },
        syncOptions: { force: true },
        ignoreResultCheck: true,
      },
      {
        properties: {
          columns: {
            birthday: { type: 'date', default: ['literal', 'now()'] },
          },
        },
        expectQueries: [
          `alter table [table] alter column "birthday" set default now();`,
        ],
      }
    );
  });

  it('should set the JSON as the default value', function () {
    return helpers.alterObject(
      'table',
      {
        properties: {
          columns: { birthday: 'json' },
        },
        ignoreResultCheck: true,
        syncOptions: { force: true },
      },
      {
        properties: {
          columns: {
            birthday: {
              type: 'json',
              default: ['json', { year: 1990, month: 7, day: 6 }],
            },
          },
        },
        expectQueries: [
          `alter table [table] alter column "birthday" set default '{"year":1990,"month":7,"day":6}';`,
        ],
      }
    );
  });

  it('should remove unnecessary default value', function () {
    return helpers.alterObject(
      'table',
      {
        properties: {
          columns: {
            birthday: {
              type: 'timestamp',
              default: ['literal', 'now()'],
            },
          },
        },
        ignoreResultCheck: true,
        syncOptions: { force: true },
      },
      {
        properties: { columns: { birthday: 'timestamp' } },
        expectQueries: [
          'alter table [table] alter column "birthday" drop default;',
        ],
      }
    );
  });
});
