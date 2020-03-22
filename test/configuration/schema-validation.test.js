'use strict';

const helpers = require('../helpers');

describe('schema validation', () => {
  const differ = helpers.createInstance();

  it('incorrect object schema structure', function () {
    expect(() => {
      differ.define('table', { name: 'table_name', columns: '' });
    }).toThrow('properties.columns > should be object');
    expect(() => {
      differ.define('sequence', { name: 'table_name', cycle: '1' });
    }).toThrow('properties.cycle > should be boolean');
  });

  it('invalid schema type', function () {
    expect(() => {
      differ.define('t', {});
    }).toThrow(`type > should be one of ['table', 'sequence']`);
  });

  it(`invalid object name`, function () {
    expect(() => {
      differ.define('table', {
        name: 'invalid.table.name',
        columns: { id: 'bigint' },
      });
    }).toThrow(`properties.name > invalid value`);
  });

  it(`multiple primary keys`, function () {
    expect(() => {
      differ.define('table', {
        name: 'users',
        columns: { id: 'bigint', age: { type: 'int', primary: true } },
        primaryKey: { columns: ['id', 'age'] },
      });
    }).toThrow(`properties.columns['age'] > should be only one primary key`);
  });
});
