'use strict';

const Differ = require('../');
const path = require('path');
const connectionConfig = require('./pg.config');
const logging = Boolean(process.env.TEST_LOGGING) && console.info;

describe('sync', () => {
  it('sync schemas', async function() {
    const differ = new Differ({
      connectionConfig,
      logging,
      schemaFolder: path.resolve(__dirname, 'schemas'),
      reconnection: false,
      force: true,
      placeholders: {
        schema: 'public',
      },
    });

    await differ.sync({ transaction: false });

    differ.define.table({
      name: 'public.blogs',
      force: false,
      cleanable: {
        unique: true,
        foreignKeys: true,
        indexes: true,
        primaryKeys: true,
        checks: true,
      },
      checks: [{ condition: 'large_id != 0' }],
      columns: [
        {
          name: 'id',
          type: 'bigint',
          autoIncrement: { start: 1, name: 'blog_id_seq' },
        },
        {
          name: 'large_id',
          type: 'bigint',
          primaryKey: true,
        },
        {
          name: 'deleted',
          type: 'bool',
          default: false,
        },
        {
          name: 'maker',
          type: 'json',
          force: true,
        },
      ],
    });

    differ.define.sequence({
      name: 'test_sequence',
      force: false,
      start: 100,
      min: 20,
      max: 100,
      cycle: false,
    });

    await differ.sync();
  });

  it('force sync', async function() {
    const differ = new Differ({
      schemaFolder: null,
      connectionConfig,
      reconnection: true,
      logging,
    });
    differ.define.table({
      name: 'children',
      force: true,
      foreignKeys: [
        {
          columns: ['parent'],
          references: {
            table: 'users',
            columns: ['description'],
          },
        },
      ],
      columns: [
        {
          name: 'id',
          type: 'bigint',
          unique: true,
          primaryKey: true,
          autoIncrement: true,
        },
        {
          name: 'age',
          type: 'bigint',
          default: 18,
        },
        {
          name: 'parent',
          type: 'varchar(255)',
        },
      ],
    });
    await differ.sync();
  });
});
