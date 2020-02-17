'use strict';

const helpers = require('../helpers');
const { expect } = require('chai');
const connectionConfig = require('../pg.config');

describe('reconnection', () => {
  it('should get an error after 2 reconnect attempts', async function() {
    const differ = helpers.createInstance({
      connectionConfig: {
        ...connectionConfig,
        port: '4444', // will be a reconnection
      },
      reconnection: { attempts: 2, delay: 100 },
    });

    differ.define('table', {
      name: 'users',
      columns: { id: 'smallint' },
    });
    let error;
    try {
      await differ.sync();
    } catch (e) {
      error = e;
    }
    expect(error).to.be.an.instanceOf(Error);
    expect(error.code).has.equal('ECONNREFUSED');
  });
});
