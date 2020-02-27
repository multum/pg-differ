'use strict';

const Differ = require('../src');
const { expect } = require('chai');
const parser = require('../src/parser');
const connectionConfig = require('./pg.config');
const logging = Boolean(process.env.LOGGING);

const _validateProperty = (object, property, method) => {
  if (Object.hasOwnProperty.call(object, property)) {
    return true;
  } else {
    throw new Error(
      `Missing required parameter '${property}' for '${method}' method`
    );
  }
};

exports.createInstance = options => {
  return new Differ({
    connectionConfig,
    logging,
    ...options,
  });
};

exports.alterObject = async (type, ...stages) => {
  const differ = exports.createInstance();
  for (const stage of stages) {
    const { properties, expectQueries, syncOptions, ignoreResultCheck } = stage;

    if (!ignoreResultCheck) {
      _validateProperty(stage, 'expectQueries', 'helpers.alterObject');
    }

    if (Array.isArray(properties)) {
      properties.forEach(p => differ.define(type, p));
    } else {
      differ.define(type, properties);
    }

    const syncResult = await differ.sync(syncOptions);
    if (!ignoreResultCheck) {
      await exports.expectSyncResult(syncResult, expectQueries);
      await exports.expectSyncResult(differ.sync({ execute: false }), []);
    }
  }

  return {
    differ,
  };
};

exports.expectSyncResult = async (promise, expectQueries) => {
  expect(await promise).to.eql(expectQueries);
};

exports.alterColumnType = (
  { table, column, type },
  differ = exports.createInstance()
) => {
  const prevType = type;
  return {
    to: ({ types, expectQuery }) => {
      types.forEach(type => {
        it(`[ ${prevType} ] => [ ${type} ]`, async function() {
          const model = differ.define('table', {
            name: table,
            columns: { [column]: { type: prevType, nullable: false } },
          });

          const normalizedPrevType = parser.columnType(prevType).raw;
          await exports.expectSyncResult(differ.sync({ force: true }), [
            `drop table if exists ${model.getQuotedFullName()} cascade;`,
            `create table ${model.getQuotedFullName()} ( "${column}" ${normalizedPrevType} not null );`,
          ]);

          const normalizedType = parser.columnType(type).raw;

          differ.define('table', {
            name: table,
            columns: { [column]: { type: normalizedType, nullable: false } },
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
