'use strict';

const helpers = require('../helpers');
const { expect } = require('chai');
const connectionConfig = require('../pg.config');

describe('reconnection', () => {
  it('should get an error after 2 reconnect attempts', async function() {
    const database = connectionConfig.database + '_not_exists';
    const differ = helpers.createInstance({
      connectionConfig: {
        ...connectionConfig,
        database, // will be a reconnection
      },
      reconnection: { attempts: 2, delay: 100 },
    });

    differ.define('table', {
      name: 'users',
      columns: [{ name: 'id', type: 'smallint' }],
    });
    let error;
    try {
      await differ.sync();
    } catch (e) {
      error = e;
    }
    expect(error).to.be.an.instanceOf(Error);
    expect(error.message).has.equal(`database "${database}" does not exist`);
  });
});
