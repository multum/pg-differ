'use strict';

const Differ = require('../');
const connectionConfig = require('./pg.config');
const helpers = require('./helpers');
const logging = Boolean(process.env.TEST_LOGGING);

describe('schema validation', () => {
  const differ = new Differ({
    connectionConfig,
    logging: logging,
    schemaFolder: null,
  });

  it('catching schema validation errors', async function() {
    await helpers.expectError(() => {
      differ.define.table({
        columns: [{ name: 'id', type: 'smallint' }],
      });
    });
  });

  it('catching schema type error', async function() {
    await helpers.expectError(() => {
      differ.define({
        type: 't', // invalid type
        properties: {
          columns: [{ name: 'id', type: 'smallint' }],
        },
      });
    });
  });

  it('missing constraint', async function() {
    await helpers.expectError(() => {
      differ.define.table({
        name: 'some_table',
        columns: [{ name: 'id', type: 'smallint' }],
        seeds: [{ id: 1, busy: "some string with quote '" }], // will be a error
      });
    });
  });

  it(`error setting 'nullable: true' for primaryKey`, async function() {
    differ.define.table({
      name: 'public.blogs',
      columns: [
        { name: 'id', type: 'smallint' },
        {
          name: 'large_id',
          type: 'bigint',
          nullable: true, // will be a error
          primaryKey: true,
        },
      ],
    });
    await helpers.expectError(() => differ.sync());
  });

  it(`error change column type with 'column.force: false'`, async function() {
    differ.define.table({
      name: 'public.blogs',
      columns: [
        {
          name: 'maker',
          type: 'bigint', // // will be a error (json => bigint)
          force: false,
        },
      ],
    });
    await helpers.expectError(() => differ.sync());
  });

  it(`invalid object name`, async function() {
    await helpers.expectError(() => {
      differ.define.table({
        name: 'public.invalid.name', // will be a error
        columns: [
          {
            name: 'id',
            type: 'bigint',
          },
        ],
      });
    });
  });
});
