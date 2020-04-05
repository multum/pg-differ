#!/usr/bin/env node
/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const yargs = require('yargs');

const cli = yargs
  .help()
  .version()
  .strict()
  .strictCommands()
  .detectLocale(false)
  .wrap(yargs.terminalWidth())
  .scriptName('pg-differ')
  .usage('\n$0 [command] [options]')
  .command(
    'sync',
    'Synchronization previously prepared schemes',
    require('./sync')
  )
  .command(
    'generate',
    'Generating schemas for existing database objects',
    require('./generate')
  );

if (!cli.argv._[0]) {
  cli.showHelp();
}
