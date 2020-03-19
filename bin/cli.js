#!/usr/bin/env node
/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const command = process.argv[2];

if (command === 'sync') {
  require('./sync');
} else {
  const allCommands = ['sync'];
  console.error(
    `Command '${command}' not found. Please use one of:` +
      allCommands.map(command => `\n   ${command}`).join('')
  );
  process.exit(1);
}
