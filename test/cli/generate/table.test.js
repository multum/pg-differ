'use strict';

const path = require('path');
const helpers = require('../../helpers');
const TempFileStorage = require('../../temp-file-storege');
const { connectionString } = require('../../pg.config');

const cliPath = path.join(helpers.rootPath, 'bin', 'cli');

describe(`cli generate`, () => {
  const tmp = TempFileStorage.allocateSpace();
  const { path: dictionary } = tmp.dir();
  const roles = {
    name: 'DifferSchema.roles',
    unique: [{ columns: ['id'] }],
    columns: {
      id: 'integer',
      created: {
        type: 'timestamp(2) with time zone',
        default: { type: 'literal', value: 'now()' },
      },
      deleted: 'timestamp(2) without time zone',
    },
  };
  const users = {
    name: 'DifferSchema.users',
    foreignKeys: [
      {
        columns: ['role'],
        references: {
          table: roles.name,
          columns: ['id'],
        },
      },
    ],
    columns: {
      id: { type: 'smallint', identity: true, primary: true },
      role: 'integer',
    },
  };

  const sequence = {
    name: 'DifferSchema.users_seq',
    start: '1',
    min: '1',
    max: '9999',
  };

  let differ;
  beforeAll(() => {
    differ = helpers.getDiffer();
    differ.define('table', roles);
    differ.define('table', users);
    differ.define('sequence', sequence);
    return differ.sync({ force: true });
  });

  it(`table schema`, async function () {
    await helpers.execute(cliPath, [
      'generate',
      `--connection=${connectionString}`,
      `--path=${dictionary}`,
      `--table=${users.name}`,
      `--table=${roles.name}`,
    ]);

    expect({
      users: helpers.readJSON(dictionary, `${users.name}.schema.json`),
      roles: helpers.readJSON(dictionary, `${roles.name}.schema.json`),
    }).toMatchSnapshot();
  });

  it(`sequence schema`, async function () {
    await helpers.execute(cliPath, [
      'generate',
      `--connection=${connectionString}`,
      `--path=${dictionary}`,
      `--sequence=${sequence.name}`,
    ]);

    expect(
      helpers.readJSON(dictionary, `${sequence.name}.schema.json`)
    ).toMatchSnapshot();
  });

  it(`grouping schemas`, async function () {
    await helpers.execute(cliPath, [
      'generate',
      `--connection=${connectionString}`,
      `--path=${dictionary}`,
      `--table=${roles.name}`,
      `--group`,
    ]);

    expect(
      helpers.readJSON(dictionary, 'DifferSchema', 'roles.schema.json')
    ).toMatchSnapshot();
  });

  it(`using --no-pretty-types`, async function () {
    await helpers.execute(cliPath, [
      'generate',
      `--connection=${connectionString}`,
      `--path=${dictionary}`,
      `--table=${roles.name}`,
      `--no-pretty-types`,
    ]);

    expect(
      helpers.readJSON(dictionary, `${roles.name}.schema.json`)
    ).toMatchSnapshot();
  });
});
