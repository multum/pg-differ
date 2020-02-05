'use strict';

const { expect } = require('chai');
const Differ = require('../');
const connectionConfig = require('./pg.config');
const logging = Boolean(process.env.LOGGING);

describe('sync', () => {
  it('importing objects', async function() {
    const differ = new Differ({
      connectionConfig,
      logging,
    });

    const importedUsingObjectOptions = differ.import({
      path: './objects',
      locals: { schema: 'public' },
    });
    expect(importedUsingObjectOptions.size).has.equal(3);

    const importedUsingStringOption = differ.import('./objects');
    expect(importedUsingStringOption.size).has.equal(3);
  });

  it('sync objects', async function() {
    const differ = new Differ({
      connectionConfig,
      logging,
      reconnection: false,
    });

    differ.import('./objects');

    await differ.sync({ transaction: false, force: true });

    differ.define('table', {
      name: 'blogs',
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

    differ.define('table', {
      name: 'users',
      columns: [
        {
          name: 'id',
          type: 'bigint',
          unique: true,
          primaryKey: true,
          autoIncrement: { actual: true },
        },
      ],
    });

    differ.define('sequence', {
      name: 'test_sequence',
      start: 100,
      min: 20,
      max: 100,
      cycle: false,
    });

    await differ.sync({
      force: false,
      cleanable: {
        unique: false,
        foreignKeys: true,
        indexes: true,
        primaryKeys: true,
        checks: true,
      },
    });
  });

  it(`creating a table with 'force: false'`, async function() {
    const differ = new Differ({
      connectionConfig,
      reconnection: true,
      logging,
    });
    const name = `public.nonexistent_table`;
    differ.define('table', {
      name,
      columns: [{ name: 'id', type: 'smallint' }],
    });
    await differ._client.query(`drop table if exists ${name}`);
    await differ.sync();
  });

  it('force sync', async function() {
    const differ = new Differ({
      connectionConfig,
      reconnection: true,
      logging,
    });
    differ.define('table', {
      name: 'children',
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
    await differ.sync({ force: true });
  });
});
