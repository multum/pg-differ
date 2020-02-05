'use strict';

const Differ = require('../');
const connectionConfig = require('./pg.config');
const logging = Boolean(process.env.LOGGING);

describe('alter columns', () => {
  const differ = new Differ({
    connectionConfig,
    logging: logging,
  });
  it('alter columns', async function() {
    differ.define('table', {
      name: 'users',
      indexes: [{ columns: ['age'] }],
      columns: [
        { name: 'id', type: 'smallint' },
        { name: 'age', type: 'varchar(255)', collate: null },
      ],
    });
    await differ.sync();

    differ.define('table', {
      name: 'users',
      columns: [
        { name: 'id', type: 'bigint', primaryKey: true },
        { name: 'new_age', type: 'bigint', formerNames: ['age'] },
        { name: 'busy', type: 'bool', default: true },
      ],
    });

    await differ.sync({ cleanable: { indexes: true } });

    differ.define('table', {
      name: 'users',
      columns: [{ name: 'busy', type: 'smallint', default: 1 }],
    });

    await differ.sync();

    // sync without changes
    await differ.sync();
  });
});
