'use strict';

const Differ = require('../src');
const { expect } = require('chai');
const { normalizeType } = require('../src/parser');
const connectionConfig = require('./pg.config');
const logging = Boolean(process.env.LOGGING);

exports.createInstance = options => {
  return new Differ({
    connectionConfig,
    logging,
    ...options,
  });
};

exports.expectSyncResult = (promise, expectQueries) => {
  return promise.then(results => {
    expect(results.length).has.equal(expectQueries.length);
    expect(results).to.eql(expectQueries);
  });
};

exports.alterColumnType = (
  { table, column, type },
  differ = exports.createInstance()
) => {
  const prevType = type;
  return {
    to: ({ type, expectQuery }) => {
      it(`[ ${prevType} ] => [ ${type} ]`, async function() {
        const model = differ.define('table', {
          name: table,
          columns: [{ name: column, type: prevType }],
        });

        const normalizedPrevType = normalizeType(prevType);
        await exports.expectSyncResult(differ.sync({ force: true }), [
          `drop table if exists ${model.getQuotedFullName()} cascade;`,
          `create table ${model.getQuotedFullName()} ( "${column}" ${normalizedPrevType} null );`,
        ]);

        const normalizedType = normalizeType(type);

        expectQuery = expectQuery.map(query => {
          return query
            .replace(/\[table]/g, model.getQuotedFullName())
            .replace(/\[type]/g, normalizedType)
            .replace(/\[column]/g, `"${column}"`);
        });

        differ.define('table', {
          name: table,
          columns: [{ name: column, type: normalizedType }],
        });

        await exports.expectSyncResult(differ.sync(), expectQuery);
        await exports.expectSyncResult(differ.sync(), []);
      });
      return exports.alterColumnType({ table, column, type }, differ);
    },
  };
};
