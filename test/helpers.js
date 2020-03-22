'use strict';

const { Client } = require('pg');
const Differ = require('../');
const helpers = require('../lib/helpers');
const connectionConfig = require('./pg.config');

exports.validateProperty = (context, property, object) => {
  if (!Object.hasOwnProperty.call(object, property)) {
    context = context ? ` in ${context}` : '';
    throw new Error(`Missing required parameter '${property}'` + context);
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

exports.createInstance = (options) => {
  return new Differ({
    connectionConfig,
    ...options,
  });
};

exports.alterObject = async (type, ...stages) => {
  const differ = exports.createInstance();
  const defaultTable = `DifferSchema.users`;
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
      exports.validateProperty('helpers.alterObject()', 'expectQueries', stage);
    }

    if (Array.isArray(properties)) {
      names = properties.map((props, index) => {
        props.name = props.name || `${defaultTable}[${index}]`;
        return [`[table[${index}]]`, props.name];
      });
      properties.forEach((props) => differ.define(type, props));
    } else {
      properties.name = properties.name || defaultTable;
      names = [['[table]', properties.name]];
      differ.define(type, properties);
    }

    const syncResult = await differ.sync(syncOptions);
    if (!ignoreResultCheck) {
      expectQueries = expectQueries.map((query) => {
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
};

exports.expectSyncResult = async (promise, expectQueries) => {
  const result = await promise;
  expect(result.queries).toEqual(expectQueries);
};
