/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const fs = require('fs');
const path = require('path');

exports.getConfig = (argv) => {
  let config = {};
  const cwd = process.cwd();

  if (argv.config) {
    config = require(path.resolve(cwd, argv.config));
  } else {
    for (const file of ['config.js', 'config.json']) {
      const pathString = path.resolve(cwd, file);
      if (fs.existsSync(pathString)) {
        config = require(pathString);
        config.connectionConfig = config.connectionConfig || config.connection;
        break;
      }
    }
  }

  if (argv.silent) {
    config.logging = false;
  }

  if (argv.connection) {
    config.connectionConfig = { connectionString: argv.connection };
  }

  return config;
};

exports.getCommonOptions = () => {
  return {
    config: {
      alias: 'C',
      describe: 'Path to configuration file',
      type: 'string',
    },
    connection: {
      alias: 'c',
      describe: 'Connection URI to database',
      type: 'string',
    },
  };
};
