'use strict';

const { Client } = require('pg');
const Differ = require('../');
const helpers = require('../lib/helpers');
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
      _validateProperty(stage, 'expectQueries', 'helpers.alterObject');
    }

    if (Array.isArray(properties)) {
      names = properties.map((props, index) => {
        props.name = props.name || `${defaultTable}[${index}]`;
        return [`[table[${index}]]`, props.name];
      });
      properties.forEach(props => differ.define(type, props));
    } else {
      properties.name = properties.name || defaultTable;
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
};

exports.expectSyncResult = async (promise, expectQueries) => {
  const result = await promise;
  expect(result.queries).toEqual(expectQueries);
};

exports.describeIndexOrConstraintTest = (type, firstStage, secondStage) => {
  const title = type
    .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1 $2')
    .toLowerCase();
  describe(title, () => {
    it(`should create a table and add "${title}"`, function() {
      return exports.alterObject(
        'table',
        {
          properties: firstStage.properties.map(props => ({
            name: props.name,
            columns: props.columns,
          })),
          syncOptions: { force: true },
          ignoreResultCheck: true,
        },
        {
          properties: firstStage.properties,
          expectQueries: firstStage.expectQueries,
        }
      );
    });

    it(`should drop unnecessary "${title}"`, function() {
      const allowClean = { [type]: true };
      return exports.alterObject(
        'table',
        {
          properties: firstStage.properties,
          syncOptions: { force: true },
          ignoreResultCheck: true,
        },
        {
          properties: firstStage.properties,
          syncOptions: { allowClean },
          expectQueries: [],
        },
        {
          properties: secondStage.properties,
          syncOptions: { allowClean },
          expectQueries: secondStage.expectQueries,
        }
      );
    });
  });
};
