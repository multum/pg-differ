'use strict';

const { Client } = require('pg');
const Differ = require('../src');
const parser = require('../src/parser');
const helpers = require('../src/helpers');
const connectionConfig = require('./pg.config');

const _validateProperty = (object, property, method) => {
  if (Object.hasOwnProperty.call(object, property)) {
    return true;
  } else {
    throw new Error(
      `Missing required parameter '${property}' for '${method}' method`
    );
  }
};

exports.getUtils = () => {
  const utils = {};
  beforeAll(() => {
    utils.client = new Client(connectionConfig);
    return utils.client.connect();
  });
  afterAll(() => {
    return utils.client.end();
  });
  return utils;
};

exports.createInstance = options => {
  return new Differ({
    connectionConfig,
    ...options,
  });
};

exports.alterObject = async (type, ...stages) => {
  const differ = exports.createInstance();
  for (const stage of stages) {
    let names;
    let {
      properties,
      expectQueries,
      syncOptions,
      ignoreResultCheck,
      onSync,
    } = stage;

    if (!ignoreResultCheck) {
      _validateProperty(stage, 'expectQueries', 'helpers.alterObject');
    }

    if (Array.isArray(properties)) {
      names = properties.map((props, index) => {
        props.name = props.name || `DifferSchema.users[${index}]`;
        return [`[table[${index}]]`, props.name];
      });
      properties.forEach(props => differ.define(type, props));
    } else {
      properties.name = properties.name || `DifferSchema.users`;
      names = [['[table]', properties.name]];
      differ.define(type, properties);
    }

    const syncResult = await differ.sync(syncOptions);
    if (!ignoreResultCheck) {
      expectQueries = expectQueries.map(query => {
        names.forEach(([placeholder, name]) => {
          query = query.replace(placeholder, helpers.quoteObjectName(name));
        });
        return query;
      });
      await exports.expectSyncResult(syncResult, expectQueries);
      await exports.expectSyncResult(differ.sync({ execute: false }), []);
    }
    if (onSync) {
      onSync(names.map(([, name]) => helpers.quoteObjectName(name)));
    }
  }

  return {
    differ,
  };
};

exports.expectSyncResult = async (promise, expectQueries) => {
  const result = await promise;
  expect(result.queries).toEqual(expectQueries);
};

exports.alterColumnType = (options, differ = exports.createInstance()) => {
  if (typeof options === 'string') {
    const type = options;
    options = { type };
  }

  const { table = 'DifferSchema.users', column = 'birthday', type } = options;

  const prevType = type;
  return {
    to: ({ types, expectQuery }) => {
      types.forEach(type => {
        it(`[ ${prevType} ] => [ ${type} ]`, async function() {
          const model = differ.define('table', {
            name: table,
            columns: { [column]: prevType },
          });

          const normalizedPrevType = parser.columnType(prevType).raw;
          await exports.expectSyncResult(differ.sync({ force: true }), [
            `drop table if exists ${model.getQuotedFullName()} cascade;`,
            `create table ${model.getQuotedFullName()} ( "${column}" ${normalizedPrevType} null );`,
          ]);

          const normalizedType = parser.columnType(type).raw;

          differ.define('table', {
            name: table,
            columns: { [column]: normalizedType },
          });
          await exports.expectSyncResult(
            differ.sync(),
            expectQuery.map(query => {
              return query
                .replace(/\[table]/g, model.getQuotedFullName())
                .replace(/\[type]/g, normalizedType)
                .replace(/\[column]/g, `"${column}"`);
            })
          );
          return exports.expectSyncResult(differ.sync({ execute: false }), []);
        });
      });
    },
  };
};
