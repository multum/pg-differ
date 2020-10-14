'use strict';

const path = require('path');
const { ImportError } = require('../../');
const helpers = require('../helpers');
const TempFileStorage = require('../temp-file-storege');

describe(`method differ.import()`, () => {
  const tmp = TempFileStorage.allocateSpace();

  it('should import the schema from the file', function () {
    const differ = helpers.getDiffer();
    const { path } = tmp.json({
      data: {
        type: 'table',
        properties: { name: 'DifferSchema.users', columns: { id: 'int' } },
      },
    });
    differ.import(path);
    expect(differ.objects).toHaveProperty('size', 1);
    expect(differ.objects.get('DifferSchema.users')).toBeDefined();
  });

  it('should import the schema from the folder', function () {
    const differ = helpers.getDiffer();
    tmp.json({
      ext: 'schema.json',
      data: {
        type: 'table',
        properties: { name: 'DifferSchema.roles', columns: { id: 'int' } },
      },
    });
    tmp.json({
      ext: 'schema.json',
      data: {
        type: 'table',
        properties: { name: 'DifferSchema.users', columns: { id: 'int' } },
      },
    });
    const returnValue = differ.import(tmp.root);
    expect(returnValue).toEqual(differ);
    expect(differ.objects).toHaveProperty('size', 2);
    expect(differ.objects.get('DifferSchema.roles')).toBeDefined();
  });

  it(`should replace placeholders with values from 'locals'`, function () {
    const locals = {
      table: 'DifferSchema.users',
      defaultInt: 10000,
      defaultRoles: { admin: false },
    };
    const schema = {
      type: 'table',
      properties: {
        name: '${table}',
        columns: {
          id: {
            type: 'bigint',
            default: { $: 'defaultInt' },
          },
          roles: {
            type: 'jsonb',
            default: ['literal', '${defaultRoles}'],
          },
          prev_roles: {
            type: 'jsonb',
            default: ['json', { $: 'defaultRoles' }], // should be get from cache
          },
        },
      },
    };
    const expectedSchema = {
      properties: {
        name: locals.table,
        columns: {
          id: {
            default: locals.defaultInt,
          },
          roles: {
            default: ['literal', JSON.stringify(locals.defaultRoles)],
          },
          prev_roles: {
            default: ['json', locals.defaultRoles],
          },
        },
      },
    };

    const differ = helpers.getDiffer();
    {
      // JSON without spaces
      const { path } = tmp.json({ data: schema });
      differ.import({ path, locals });
      expect(differ.objects.get(locals.table)).toMatchObject(expectedSchema);
    }

    {
      // JSON with spaces
      const { path } = tmp.json({ space: 2, data: schema });
      differ.import({ path, locals });
      expect(differ.objects.get(locals.table)).toMatchObject(expectedSchema);
    }
  });

  it(`should get an error when trying to import a schema from a nonexistent file`, function () {
    const expectedPath = path.resolve(__dirname, './invalidPath'); // absolute path
    expect(() => {
      helpers.getDiffer().import('./invalidPath');
    }).toThrow(
      new ImportError(
        'Schema files not found at the specified path',
        expectedPath
      )
    );
  });
});
