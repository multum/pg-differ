'use strict';

const Differ = require('../');
const connectionConfig = require('./pg.config');
const logging = Boolean(process.env.TEST_LOGGING);

describe('schema validation', () => {
  const differ = new Differ({
    connectionConfig,
    logging: logging,
    schemaFolder: null,
  });
  it('catching schema validation errors', function(done) {
    try {
      differ.define.table({
        columns: [{ name: 'id', type: 'smallint' }],
      });
    } catch (e) {
      done();
    }
  });

  it('catching schema type error', function(done) {
    try {
      differ.define({
        type: 't', // invalid type
        properties: {
          columns: [{ name: 'id', type: 'smallint' }],
        },
      });
    } catch (e) {
      done();
    }
  });

  it('missing constraint error', function(done) {
    try {
      differ.define.table({
        name: 'some_table',
        columns: [{ name: 'id', type: 'smallint' }],
        seeds: [{ id: 1, busy: "some string with quote '" }], // will be a error
      });
    } catch (e) {
      done();
    }
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

    try {
      await differ.sync();
    } catch (e) {
      return true;
    }

    throw new Error('error test');
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

    try {
      await differ.sync();
    } catch (e) {
      return true;
    }

    throw new Error('error test');
  });
});
