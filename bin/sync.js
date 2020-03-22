#!/usr/bin/env node
/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const minimist = require('minimist');
const chalk = require('chalk');
const path = require('path');
const Differ = require('../lib');
const pkg = require('../package.json');

const argv = minimist(process.argv.slice(3), {
  stopEarly: false,
  alias: {
    h: 'help',
    '?': 'help',
    v: 'version',
    c: 'connection',
    f: 'force',
    S: 'silent',
    s: 'set',
  },
  default: {
    silent: false,
    force: false,
  },
  boolean: ['version', 'help', 'silent'],
});

if (argv.version) {
  console.info(pkg.version);
  process.exit(0);
}

if (argv.help) {
  const title = chalk.blue('Usage: pg-differ [options] [path]');
  const link = 'https://multum.github.io/pg-differ/#/cli';

  // prettier-ignore
  const args = [
    { key: '--connection, -c', descriptions: 'Connection URI to database' },
    { key: '--silent, -S', descriptions: 'Option to disable printing messages through the console' },
    { key: '--set, -s', descriptions: 'Set variable with value to replace placeholders in schema files' },
    { key: '--force, -f', descriptions: 'Force synchronization of tables and sequences (drop and create)' },
    { key: '--version, -v', descriptions: 'Print out the installed version' },
    { key: '--help, -h, -?', descriptions: 'Show this help' },
  ];

  const offsetLeft = Math.max(...args.map(([key]) => key.length)) + 4;
  const message = args.reduce((acc, [key, description]) => {
    key = chalk.yellow(key) + [...new Array(offsetLeft - key.length)].join(' ');
    return `${acc}\n  ${key}${description}`;
  }, title);

  console.info(`${message}\n${link}`);
  process.exit(0);
}

const getLocals = () => {
  if (argv.set) {
    const variables = Array.isArray(argv.set) ? argv.set : [argv.set];
    return variables.reduce((acc, element) => {
      const [key, value] = element.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
  } else {
    return null;
  }
};

const differ = new Differ({
  logging: !argv.silent,
  connectionConfig: {
    connectionString: argv.connection,
  },
});

differ.import({
  path: path.resolve(process.cwd(), argv._[0] || './'),
  locals: getLocals(),
});

differ
  .sync({ force: argv.force })
  .then(() => process.exit(0))
  .catch((error) => console.error(error) || process.exit(1));
