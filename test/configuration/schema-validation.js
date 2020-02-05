'use strict';

const { expect } = require('chai');
const { ValidationError } = require('../../src/errors');
const helpers = require('../helpers');

describe('schema validation', () => {
  const differ = helpers.createInstance();

  it('catching schema validation errors', function() {
    try {
      differ.define('table', { name: 'table_name', columns: {} });
    } catch (error) {
      expect(error).to.be.an.instanceOf(ValidationError);
      expect(error.get('properties.columns')[0].keyword).to.equal('type');
    }
    try {
      differ.define('sequence', { name: 'table_name', cycle: '1' });
    } catch (error) {
      expect(error).to.be.an.instanceOf(ValidationError);
      expect(error.get('properties.cycle')[0].keyword).to.equal('type');
    }
  });

  it('catching schema type error', function() {
    try {
      differ.define('t', {});
    } catch (error) {
      expect(error).to.be.an.instanceOf(ValidationError);
      expect(error.get('type')[0].message).to.equal('Invalid schema type: t');
    }
  });

  it(`invalid object name`, function() {
    try {
      differ.define('table', {
        name: 'public.invalid.name',
        columns: [{ name: 'id', type: 'bigint' }],
      });
    } catch (error) {
      expect(error).to.be.an.instanceOf(ValidationError);
      expect(error.get('properties.name')[0].message).to.equal(
        `Invalid object name: 'public.invalid.name'`
      );
    }
  });
});
