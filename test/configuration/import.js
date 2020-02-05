'use strict';

const { expect } = require('chai');
const path = require('path');
const { ImportError } = require('../../src/errors');
const helpers = require('../helpers');
const {
  TABLES: { ROLES, USERS },
} = require('../objects');

describe(`method import()'`, () => {
  const differ = helpers.createInstance();

  it(`getting an error when trying to import a schema from a nonexistent file`, function() {
    const folderPath = './invalidSchemas';
    const expectedPath = path.resolve(__dirname, folderPath); // absolute path
    try {
      differ.import(folderPath);
    } catch (error) {
      expect(error).to.be.an.instanceOf(ImportError);
      expect(error.path).to.equal(expectedPath);
      expect(error.message).to.equal(
        'File or folder is missing at the specified path'
      );
    }
  });

  it('import schemas from a folder', function() {
    const importedUsingObjectOptions = differ.import({
      path: '../objects',
      locals: { USERS, ROLES },
    });
    expect(importedUsingObjectOptions.size).has.equal(2);
    expect(importedUsingObjectOptions.get(ROLES)).to.not.equal(undefined);
  });

  it('import schemas from a file', function() {
    const importedUsingStringOption = differ.import(
      '../objects/users.schema.json'
    );
    expect(importedUsingStringOption.size).has.equal(1);
  });
});
