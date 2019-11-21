#!/usr/bin/env node
'use strict';

const minimist = require('minimist');
const Differ = require('../src');
const pkg = require('../package.json');

const argv = minimist(process.argv.slice(2), {
  alias: {
    s: 'schemaFolder',
    v: 'version',
    c: 'connectionString',
    p: 'placeholders',
    l: 'logging',
    f: 'force',
  },
  default: {
    l: true,
    f: false,
  },
  boolean: ['version', 'help', 'logging'],
});

const path = (argv._.length ? argv._[0] : argv.schemaFolder) || './schemas';

if (argv.schemaFolder) {
  console.warn(
    `The argument '--schemaFolder' is deprecated.\n` +
      `Use unnamed argument. Example: pg-differ -c postgresql://{...} ./schemas`
  );
}

if (argv.version) {
  console.info(pkg.version);
  process.exit(0);
}

const logOptions = () => {
  console.info(`Usage: pg-differ [options]
  --connectionString, -c     Connection URI to database
  --schemaFolder, -s         Path to the folder with *.schema.json files. Default value is './schemas'
  --placeholders, -p         An string with names and their values to replace placeholders in 'schemaFolder' files
  --logging, -l              Option to enable logging in the console
  --force, -f                Force synchronization of table (drop and create)
  --version, -v              Print out the installed version
  --help                     Show this help
  `);
};

if (argv.help) {
  logOptions();
  process.exit(0);
}

const getPlaceholders = () =>
  argv.placeholders
    ? argv.placeholders.split(',').reduce((acc, element) => {
        const [key, value] = element.trim().split(':');
        acc[key] = value;
        return acc;
      }, {})
    : null;

const differ = new Differ({
  logging: argv.logging,
  force: argv.force,
  connectionConfig: {
    connectionString: argv.connectionString,
  },
});

differ.import({
  path,
  locals: getPlaceholders(),
});

differ
  .sync()
  .then(() => process.exit(0))
  .catch(error => console.error(error) || process.exit(1));
