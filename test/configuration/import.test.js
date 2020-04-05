'use strict';

const path = require('path');
const { ImportError } = require('../../');
const helpers = require('../helpers');

describe(`method differ.import()`, () => {
  it(`should get an error when trying to import a schema from a nonexistent file`, function () {
    const folderPath = './invalidPath';
    const expectedPath = path.resolve(__dirname, folderPath); // absolute path
    expect(() => helpers.getDiffer().import(folderPath)).toThrow(
      new ImportError(
        'Schema files not found at the specified path',
        expectedPath
      )
    );
  });

  it('should import the schema from the folder', function () {
    const differ = helpers.getDiffer();
    const returnValue = differ.import({
      path: '../objects',
      locals: {
        tables: { users: 'DifferSchema.users', roles: 'DifferSchema.roles' },
      },
    });
    expect(returnValue).toEqual(differ);
    expect(differ.objects).toHaveProperty('size', 2);
    expect(differ.objects.get('DifferSchema.roles')).toBeDefined();
  });

  it('should import the schema from the file', function () {
    const differ = helpers.getDiffer();
    differ.import('../objects/users.schema.json');
    expect(differ.objects).toHaveProperty('size', 1);
  });

  it(`should replace placeholders with values from 'locals'`, function () {
    const differ = helpers.getDiffer();
    differ.import({
      path: '../objects/roles.schema.json',
      locals: {
        tables: { roles: 'DifferSchema.roles' },
        defaultPrimaryKey: '1099',
      },
    });
    expect(differ.objects).toHaveProperty('size', 1);
    expect(differ.objects.get('DifferSchema.roles')).toBeDefined();
    expect(differ.objects.get('DifferSchema.roles')).toMatchObject({
      properties: {
        columns: {
          id: { default: '1099' },
        },
      },
    });
  });
});
