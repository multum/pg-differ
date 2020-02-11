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
        differ.define('table', { name: 'table_name', columns: {} });
      } catch (e) {
        error = e;
      }
      expect(error).to.be.an.instanceOf(ValidationError);
      expect(error.get('properties.columns')[0].keyword).to.equal('type');
    }
    {
      let error;
      try {
        differ.define('sequence', { name: 'table_name', cycle: '1' });
      } catch (e) {
        error = e;
      }
      expect(error).to.be.an.instanceOf(ValidationError);
      expect(error.get('properties.cycle')[0].keyword).to.equal('type');
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
    expect(error.get('type')[0].message).to.equal('Invalid schema type: t');
  });

  it(`should get a object name validation error`, function() {
    let error;
    try {
      differ.define('table', {
        name: 'public.invalid.name',
        columns: [{ name: 'id', type: 'bigint' }],
      });
    } catch (e) {
      error = e;
    }
    expect(error).to.be.an.instanceOf(ValidationError);
    expect(error.get('properties.name')[0].message).to.equal(
      `Invalid object name: 'public.invalid.name'`
    );
  });
});
