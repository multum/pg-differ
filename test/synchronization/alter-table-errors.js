'use strict';

const { expect } = require('chai');
const { SynchronizationError } = require('../../src/errors');
const helpers = require('../helpers');

describe('alter table errors', () => {
  it(`getting column type change error with 'column.force: false'`, async function() {
    const differ = helpers.createInstance();

    differ.define('table', {
      name: 'users',
      columns: [{ name: 'birthday', type: 'json' }],
    });
    await differ.sync({ force: true });

    differ.define('table', {
      name: 'users',
      columns: [{ name: 'birthday', type: 'bigint' }],
    });
    try {
      await differ.sync();
    } catch (error) {
      expect(error).to.be.an.instanceOf(SynchronizationError);
      expect(error.message).to.equal(
        `Impossible type change from 'json' to 'bigint' without losing column data`
      );
    }
  });
});
