'use strict';

const { expect } = require('chai');
const Differ = require('../');
const path = require('path');
const connectionConfig = require('./pg.config');
const logging = Boolean(process.env.TEST_LOGGING) && console.info;

describe('sync', () => {
  it('importing schemas', async function() {
    const differ = new Differ({
      connectionConfig,
      logging,
    });

    const importedUsingObjectOptions = differ.import({
      path: path.resolve(__dirname, 'schemas'),
      locals: { schema: 'public' },
    });
    expect(importedUsingObjectOptions.size).has.equal(3);

    const importedUsingStringOption = differ.import(
      path.resolve(__dirname, 'schemas')
    );
    expect(importedUsingStringOption.size).has.equal(3);
  });

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

    differ.define.table({
      name: 'public.users',
      force: false,
      columns: [
        {
          name: 'id',
          type: 'bigint',
          unique: true,
          primaryKey: true,
          autoIncrement: { actual: true },
          nullable: false,
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

  it(`creating a table with 'force: false'`, async function() {
    const differ = new Differ({
      schemaFolder: null,
      connectionConfig,
      reconnection: true,
      logging,
    });
    const name = `public.nonexistent_table`;
    differ.define.table({
      name,
      columns: [{ name: 'id', type: 'smallint' }],
    });
    await differ._client.query(`drop table if exists ${name}`);
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
