'use strict';

const { expect } = require('chai');
const { ValidationError } = require('../../src/errors');
const helpers = require('../helpers');

describe('schema validation', () => {
  const differ = helpers.createInstance();

  it('should get a schema validation error', function() {
    {
      let error;
      try {
        differ.define('table', { name: 'table_name', columns: '' });
      } catch (e) {
        error = e;
      }
      expect(error).to.be.an.instanceOf(ValidationError);
      expect(error.message).to.equal(`[properties.columns]: should be object`);
    }
    {
      let error;
      try {
        differ.define('sequence', { name: 'table_name', cycle: '1' });
      } catch (e) {
        error = e;
      }
      expect(error).to.be.an.instanceOf(ValidationError);
      expect(error.message).to.equal('[properties.cycle]: should be boolean');
    }
  });

  it('should get a schema type validation error', function() {
    let error;
    try {
      differ.define('t', {});
    } catch (e) {
      error = e;
    }
    expect(error).to.be.an.instanceOf(ValidationError);
    expect(error.message).to.equal(
      `[type]: should be one of ['table', 'sequence']`
    );
  });

  it(`should get a object name validation error`, function() {
    let error;
    try {
      differ.define('table', {
        name: 'public.invalid.name',
        columns: { id: 'bigint' },
      });
    } catch (e) {
      error = e;
    }
    expect(error).to.be.an.instanceOf(ValidationError);
    expect(error.message).to.equal(`[properties.name]: invalid value`);
  });
});
