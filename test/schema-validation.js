'use strict';

const Differ = require('../');
const connectionConfig = require('./pg.config');
const helpers = require('./helpers');
const logging = Boolean(process.env.LOGGING);

describe('schema validation', () => {
  const differ = new Differ({
    connectionConfig,
    logging: logging,
  });

  it('catching schema validation errors', async function() {
    await helpers.expectError(() => {
      differ.define('table', {
        name: 'blogs',
        columns: {}, // will be a error
      });
    });
    await helpers.expectError(() => {
      differ.define('sequence', {
        name: 'blogs_seq',
        cycle: '1', // will be a error
      });
    });
  });

  it('catching schema type error', async function() {
    await helpers.expectError(() => {
      differ.define('t', {
        name: 'blogs',
        columns: [{ name: 'id', type: 'smallint' }],
      });
    });
  });

  it(`error change column type with 'column.force: false'`, async function() {
    differ.define('table', {
      name: 'blogs',
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
      differ.define('table', {
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

  it(`undefined local variable in *.json`, async function() {
    await helpers.expectError(() => {
      differ.import('./invalidSchemas');
    });
  });
});
