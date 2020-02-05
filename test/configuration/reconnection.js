'use strict';

const helpers = require('../helpers');
const connectionConfig = require('../pg.config');

describe('reconnection', () => {
  it('error after 2 attempts', async function() {
    const differ = helpers.createInstance({
      connectionConfig: {
        ...connectionConfig,
        database: connectionConfig.database + '_not_exists', // will be a reconnection
      },
      reconnection: { attempts: 2, delay: 100 },
    });
    differ.define('table', {
      name: 'users',
      columns: [{ name: 'id', type: 'smallint' }],
    });
    await helpers.expectError(() => differ.sync());
  });
});
