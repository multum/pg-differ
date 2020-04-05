'use strict';

const fs = require('fs');
const path = require('path');

const helpers = require('../../helpers');
const { connectionString } = require('../../pg.config');

const cliPath = path.join(helpers.rootPath, 'bin', 'cli');
const dictionary = path.join(__dirname, '__schemas__');

describe(`cli generate`, () => {
  const roles = {
    name: 'DifferSchema.roles',
    unique: [{ columns: ['id'] }],
    columns: { id: 'integer' },
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
      birthday: {
        type: 'timestamp without time zone',
        default: { type: 'literal', value: 'now()' },
      },
      joined: 'timestamp without time zone',
      role: 'integer',
    },
  };

  const sequence = {
    name: 'DifferSchema.users_seq',
    start: '1',
    min: '1',
    max: '9999',
  };

  afterAll(() => {
    helpers.rmdirSync(dictionary, { recursive: true });
  });

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
      `--no-group`,
    ]);

    expect(
      JSON.parse(
        fs.readFileSync(
          path.join(dictionary, `${users.name}.schema.json`),
          'utf-8'
        )
      )
    ).toEqual({ type: 'table', properties: users });
  });

  it(`sequence schema`, async function () {
    await helpers.execute(cliPath, [
      'generate',
      `--connection=${connectionString}`,
      `--path=${dictionary}`,
      `--sequence=${sequence.name}`,
      `--no-group`,
    ]);

    expect(
      JSON.parse(
        fs.readFileSync(
          path.join(dictionary, `${sequence.name}.schema.json`),
          'utf-8'
        )
      )
    ).toMatchObject({
      type: 'sequence',
      properties: { name: sequence.name, max: sequence.max },
    });
  });

  it(`grouping schemas`, async function () {
    await helpers.execute(cliPath, [
      'generate',
      `--connection=${connectionString}`,
      `--path=${dictionary}`,
      `--table=${users.name}`,
      `--group`,
    ]);

    expect(
      JSON.parse(
        fs.readFileSync(
          path.join(dictionary, 'DifferSchema', 'users.schema.json'),
          'utf-8'
        )
      )
    ).toEqual({ type: 'table', properties: users });
  });
});
