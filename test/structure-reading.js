'use strict';

const Differ = require('../');
const connectionConfig = require('./pg.config');

describe('reading structure', function() {
  const differ = new Differ({
    connectionConfig,
    reconnection: false,
  });

  it('table', async function() {
    differ.define('table', {
      name: 'users',
      columns: [
        { name: 'id', type: 'bigint', autoIncrement: true, primaryKey: true },
        { name: 'age', type: 'smallint', default: 18 },
        { name: 'description', type: 'varchar(255)', default: 'some user' },
        { name: 'deleted', type: 'bool', default: false },
        { name: 'valid', type: 'bool', default: true },
        {
          name: 'document',
          type: 'json',
          default: { type: 'passport', properties: {} },
        },
      ],
    });

    await differ.sync({ force: true });
  });

  it('sequence', async function() {
    differ.define('sequence', {
      name: 'users_id_seq',
      start: '10',
      min: '10',
      max: '20',
    });

    await differ.sync({ force: true });
  });
});
