#!/usr/bin/env node
'use strict';

const minimist = require('minimist');
const path = require('path');
const Differ = require('../src');
const pkg = require('../package.json');

const argv = minimist(process.argv.slice(2), {
  alias: {
    v: 'version',
    c: 'connectionString',
    p: 'locals',
    s: 'silent',
    f: 'force',
  },
  default: {
    s: false,
    f: false,
  },
  boolean: ['version', 'help', 'silent'],
});

if (argv.version) {
  console.info(pkg.version);
  process.exit(0);
}

const logOptions = () => {
  console.info(`Usage: pg-differ [options]
  --connectionString, -c     Connection URI to database
  --silent, -s               Option to disable printing messages through the console
  --locals, -l               An string with names and their values to replace placeholders in schema files
  --force, -f                Force synchronization of table (drop and create)
  --version, -v              Print out the installed version
  --help                     Show this help
  `);
};

if (argv.help) {
  logOptions();
  process.exit(0);
}

const getLocals = () =>
  argv.locals
    ? argv.locals.split(',').reduce((acc, element) => {
        const [key, value] = element.trim().split(':');
        acc[key] = value;
        return acc;
      }, {})
    : null;

const differ = new Differ({
  logging: !argv.silent,
  connectionConfig: {
    connectionString: argv.connectionString,
  },
});

differ.import({
  path: path.resolve(process.cwd(), argv._[0] || './'),
  locals: getLocals(),
});

differ
  .sync({ force: argv.force })
  .then(() => process.exit(0))
  .catch(error => console.error(error) || process.exit(1));
