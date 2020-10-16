'use strict';

const helpers = require('../helpers');
const ConnectionManager = require('../../lib/connection-manager');

describe(`ConnectionManager`, () => {
  const connection = helpers.getConnection();
  it('transaction(client, callback)', async function () {
    const result = await ConnectionManager.transaction(
      connection.client,
      () => {
        return connection.client.query('select 2048 as number');
      }
    );
    expect(connection.client._querySpy.mock.calls).toEqual([
      ['begin'],
      ['select 2048 as number'],
      ['commit'],
    ]);
    expect(result).toMatchObject({ rows: [{ number: 2048 }] });
  });

  it('transaction(client, callback, false)', async function () {
    const result = await ConnectionManager.transaction(
      connection.client,
      () => connection.client.query('select 2048 as number'),
      false
    );
    expect(connection.client._querySpy.mock.calls).toEqual([
      ['select 2048 as number'],
    ]);
    expect(result).toMatchObject({ rows: [{ number: 2048 }] });
  });

  it('transaction() rollback', async function () {
    await expect(
      ConnectionManager.transaction(connection.client, () => {
        return connection.client.query('select \\ 2048 as number');
      })
    ).rejects.toBeDefined();
    expect(connection.client._querySpy.mock.calls).toEqual([
      ['begin'],
      ['select \\ 2048 as number'],
      ['rollback'],
    ]);
  });
});
