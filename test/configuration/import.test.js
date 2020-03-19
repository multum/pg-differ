'use strict';

const path = require('path');
const { ImportError } = require('../../lib/errors');
const helpers = require('../helpers');

describe(`method import()`, () => {
  const differ = helpers.createInstance();

  it(`should get an error when trying to import a schema from a nonexistent file`, function() {
    const folderPath = './invalidPath';
    const expectedPath = path.resolve(__dirname, folderPath); // absolute path
    expect(() => differ.import(folderPath)).toThrow(
      new ImportError(
        'Schema files not found at the specified path',
        expectedPath
      )
    );
  });

  it('should import the schema from the folder', function() {
    const importedUsingObjectOptions = differ.import({
      path: '../objects',
      locals: {
        tables: { users: 'DifferSchema.users', roles: 'DifferSchema.roles' },
      },
    });
    expect(importedUsingObjectOptions).toHaveProperty('size', 2);
    expect(importedUsingObjectOptions.get('DifferSchema.roles')).toBeDefined();
  });

  it('should import the schema from the file', function() {
    const importedUsingStringOption = differ.import(
      '../objects/users.schema.json'
    );
    expect(importedUsingStringOption).toHaveProperty('size', 1);
  });

  it(`should replace placeholders with values from 'locals'`, function() {
    const imported = differ.import({
      path: '../objects/roles.schema.json',
      locals: {
        tables: { roles: 'DifferSchema.roles' },
        defaultPrimaryKey: '1099',
      },
    });
    expect(imported).toHaveProperty('size', 1);
    const importedObject = [...imported.values()][0];
    expect(importedObject.getFullName()).toEqual('DifferSchema.roles');
    expect(importedObject.properties.columns['id'].default).toEqual('1099');
  });
});
