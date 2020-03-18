'use strict';

const helpers = require('../helpers');

describe('schema validation', () => {
  const differ = helpers.createInstance();

  it('should get a schema validation error', function() {
    expect(() => {
      differ.define('table', { name: 'table_name', columns: '' });
    }).toThrow('[properties.columns]: should be object');
    expect(() => {
      differ.define('sequence', { name: 'table_name', cycle: '1' });
    }).toThrow('[properties.cycle]: should be boolean');
  });

  it('should get a schema type validation error', function() {
    expect(() => {
      differ.define('t', {});
    }).toThrow(`[type]: should be one of ['table', 'sequence']`);
  });

  it(`should get a object name validation error`, function() {
    expect(() => {
      differ.define('table', {
        name: 'public.invalid.name',
        columns: { id: 'bigint' },
      });
    }).toThrow(`[properties.name]: invalid value`);
  });
});
