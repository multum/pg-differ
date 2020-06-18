/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const path = require('path');
const Differ = require('../lib');

module.exports.builder = (yargs) => {
  yargs
    .usage('\n$0 sync [options]')
    .option('path', {
      alias: 'p',
      describe: 'Directory path',
      demandOption: true,
      type: 'string',
    })
    .option('connection', {
      alias: 'c',
      describe: 'Connection URI to database',
      type: 'string',
    })
    .option('set', {
      alias: 's',
      describe: 'Variable to replace placeholder in schema files',
      type: 'string',
    })
    .option('force', {
      alias: 'f',
      default: false,
      describe: 'Force synchronization of tables and sequences',
      type: 'boolean',
    })
    .option('silent', {
      alias: 'S',
      default: false,
      describe: 'Disable printing messages through the console',
      type: 'boolean',
    });
};

module.exports.handler = (argv) => {
  let locals = null;

  if (argv.set) {
    const variables = Array.isArray(argv.set) ? argv.set : [argv.set];
    locals = variables.reduce((acc, element) => {
      const [key, value] = element.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
  }

  const differ = new Differ({
    logging: !argv.silent,
    connectionConfig: {
      connectionString: argv.connection,
    },
  });

  const directory = path.resolve(process.cwd(), argv.path);

  differ.import({ path: directory, locals });

  differ
    .sync({ force: argv.force })
    .then(() => {
      process.exitCode = 0;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
};
