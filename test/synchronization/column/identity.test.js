'use strict';

const helpers = require('../../helpers');

describe('identity', () => {
  it('should create table with identity column', function() {
    return helpers.alterObject('table', {
      properties: {
        columns: {
          id: { type: 'integer', identity: true },
        },
      },
      syncOptions: { force: true },
      expectQueries: [
        'drop table if exists [table] cascade;',
        'create table [table] ( "id" integer generated BY DEFAULT as identity );',
      ],
    });
  });

  it('should change the identity column', function() {
    return helpers.alterObject(
      'table',
      {
        properties: {
          columns: {
            id: {
              type: 'integer',
              identity: { start: 100, min: 100, max: 9999 },
            },
          },
        },
        syncOptions: { force: true },
        ignoreResultCheck: true,
      },
      {
        properties: {
          columns: {
            id: {
              type: 'integer',
              identity: { max: 10000 },
            },
          },
        },
        expectQueries: [
          'alter table [table] alter column "id" set maxvalue 10000;',
        ],
      }
    );
  });

  it('should change the identity column', function() {
    return helpers.alterObject(
      'table',
      {
        properties: {
          columns: {
            id: {
              type: 'integer',
              identity: { start: 0, min: 0, max: 100 },
            },
          },
        },
        syncOptions: { force: true },
        ignoreResultCheck: true,
      },
      {
        properties: {
          columns: {
            id: {
              type: 'integer',
              identity: { start: 100, min: 0, max: 9999 },
            },
          },
        },
        expectQueries: [
          'alter table [table] alter column "id" set start 100 set maxvalue 9999;',
        ],
      }
    );
  });

  it('should remove identity attribute of column', function() {
    return helpers.alterObject(
      'table',
      {
        properties: {
          columns: {
            id: { type: 'integer', identity: true },
          },
        },
        syncOptions: { force: true },
        ignoreResultCheck: true,
      },
      {
        properties: {
          columns: {
            id: { type: 'integer', identity: false },
          },
        },
        expectQueries: [
          'alter table [table] alter column "id" drop identity;',
          'alter table [table] alter column "id" drop not null;',
        ],
      }
    );
  });

  it('should actualize identity column', function() {
    return helpers.alterObject(
      'table',
      {
        properties: {
          columns: {
            id: { type: 'integer', identity: true },
          },
        },
        syncOptions: { force: true },
        ignoreResultCheck: true,
        onSync: (differ, tables) => {
          return differ._client.query(
            `insert into ${tables[0]} (id) values(100)`
          );
        },
      },
      {
        properties: {
          columns: {
            id: { type: 'integer', identity: true },
          },
        },
        syncOptions: { actualizeIdentityColumns: true },
        expectQueries: [
          'alter table "DifferSchema"."users" alter column "id" restart with 100;',
        ],
      }
    );
  });
});
