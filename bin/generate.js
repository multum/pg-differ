/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const Metalize = require('metalize');

const utils = require('../lib/utils');
const parser = require('../lib/parser');
const Types = require('../lib/types');
const { Columns, Sequences, Constraints } = require('../lib/constants');

const _simplifiedTypes = {
  [Types.bitVarying]: 'varbit',
  [Types.characterVarying]: 'varchar',
  [Types.doublePrecision]: 'float8',
  [Types.time]: 'time',
  [Types.timeTZ]: 'timetz',
  [Types.timeStamp]: 'timestamp',
  [Types.timeStampTZ]: 'timestamptz',
};

const toArray = (target) => {
  if (utils.isExist(target)) {
    return Array.isArray(target) ? target : [target];
  } else {
    return [];
  }
};

module.exports.builder = (yargs) => {
  yargs
    .check((argv) => {
      if (argv.table || argv.sequence) {
        return true;
      } else {
        throw new Error('At least one object name must be passed');
      }
    })
    .usage('\n$0 generate [options]')
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
    .option('group', {
      alias: 'g',
      describe: 'Grouping by folders with schemas as names',
      default: false,
      type: 'boolean',
    })
    .option('pretty-types', {
      alias: 'pt',
      describe: 'Using short aliases for long data type names',
      default: true,
      type: 'boolean',
    })
    .option('table', {
      alias: 't',
      describe: 'Table name',
      type: 'string',
    })
    .option('sequence', {
      alias: 's',
      describe: 'Sequence name',
      type: 'string',
    });
};

module.exports.handler = function (argv) {
  const tables = toArray(argv.table);
  const sequences = toArray(argv.sequence);

  const metalize = new Metalize({
    dialect: 'postgres',
    connectionConfig: argv.connection,
  });

  console.info(chalk.green('Creating schemas...'));

  return metalize
    .find({ tables, sequences })
    .then((metadata) => {
      const schemas = [];
      const missing = [];

      tables.forEach((name) => {
        const data = metadata.tables.get(name);
        if (data) {
          schemas.push(_prepareTableSchema(data, argv));
        } else {
          missing.push(name);
        }
      });

      sequences.forEach((name) => {
        const data = metadata.sequences.get(name);
        if (data) {
          schemas.push(_prepareSequenceSchema(data, argv));
        } else {
          missing.push(name);
        }
      });

      if (missing.length) {
        console.warn(
          chalk.yellow('The following items are missing:') +
            '\n' +
            missing.map((name) => `   - ${name}`).join('\n')
        );
      }

      if (schemas.length) {
        let directory = process.cwd();

        if (argv.path !== '.' && argv.path !== './') {
          // prepare directory
          directory = path.resolve(directory, argv.path);
          fs.mkdirSync(directory, { recursive: true });
        }

        const createdGroupDirectories = {};

        schemas.forEach((object) => {
          let filepath;
          if (argv.group) {
            const [schema, name] = parser.name(object.properties.name);
            const groupPath = path.join(directory, schema);

            if (!createdGroupDirectories[schema]) {
              fs.mkdirSync(groupPath, { recursive: true });
              createdGroupDirectories[schema] = true;
            }

            filepath = path.join(groupPath, `${name}.schema.json`);
          } else {
            const { name } = object.properties;
            filepath = path.join(directory, `${name}.schema.json`);
          }

          fs.writeFileSync(filepath, JSON.stringify(object, null, 2), 'utf-8');
        });
      }
    })
    .then(() => {
      console.info(chalk.green('Creating schemes completed'));
      process.exitCode = 0;
    })
    .catch(async (error) => {
      console.error(error);
      process.exitCode = 1;
    });
};

const _prepareSequenceSchema = (metadata) => {
  return {
    type: 'sequence',
    properties: utils.getDiff(metadata, Sequences.getDefaults()),
  };
};

const _prepareTableSchema = (metadata, argv) => {
  const properties = { name: metadata.name, columns: {} };
  metadata.columns.forEach(({ name, identity, ...attrs }) => {
    const column = utils.getDiff(attrs, Columns.getDefaults(attrs.type));
    if (identity) {
      delete column.nullable;
      identity = utils.getDiff(
        identity,
        Columns.getIdentityDefaults(column.type)
      );
      if (Object.keys(identity).length === 0) {
        identity = true;
      }
      column.identity = identity;
    }

    if (metadata.primaryKey && metadata.primaryKey.columns.includes(name)) {
      delete column.nullable;
      if (metadata.primaryKey.columns.length === 1) {
        delete metadata.primaryKey;
        column.primary = true;
      }
    }

    if (utils.isExist(column.default)) {
      column.default = { type: 'literal', value: column.default };
    }

    if (argv['pretty-types']) {
      const parsedType = Types.parse(column.type);
      const simplified = _simplifiedTypes[parsedType.name];
      if (simplified) {
        column.type = simplified;
        if (parsedType.arguments.length) {
          column.type += `(${parsedType.arguments.join(',')})`;
        }
        if (parsedType.dimensions) {
          column.type += '[]'.repeat(parsedType.dimensions);
        }
      }
    }

    if (Object.keys(column).length === 1) {
      properties.columns[name] = column.type;
    } else {
      properties.columns[name] = column;
    }
  });

  ['foreignKeys', 'indexes', 'unique', 'checks'].forEach((name) => {
    if (metadata[name].length) {
      properties[name] = metadata[name].map((i) => utils.omit(['name'], i));
    }
  });

  if (properties.foreignKeys) {
    properties.foreignKeys = properties.foreignKeys.map((foreignKey) => {
      return utils.getDiff(foreignKey, Constraints.ForeignKeyDefaults);
    });
  }

  if (metadata.primaryKey) {
    properties.primaryKey = utils.omit(['name'], metadata.primaryKey);
  }
  return { type: 'table', properties };
};
