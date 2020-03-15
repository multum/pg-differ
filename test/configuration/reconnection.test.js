'use strict';

const helpers = require('../helpers');
const connectionConfig = require('../pg.config');

describe('reconnection', () => {
  it('should get an error after 1 reconnect attempts', async function() {
    const differ = helpers.createInstance({
      connectionConfig: {
        ...connectionConfig,
        port: '4444', // will be a reconnection
      },
      reconnection: { attempts: 1, delay: 10 },
    });

    differ.define('table', {
      name: 'users',
      columns: { id: 'smallint' },
    });
    return expect(differ.sync()).rejects.toThrow(/ECONNREFUSED/);
  });
});
