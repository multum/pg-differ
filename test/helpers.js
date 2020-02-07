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
        differ.define('table', {
          name: table,
          columns: [{ name: column, type: normalizeType(prevType) }],
        });

        await differ.sync({ force: true }); // TODO: need to test expected queries using `expectSyncResult`

        const normalizedType = normalizeType(type);

        expectQuery = expectQuery.map(query => {
          return query
            .replace(/\[table]/g, table)
            .replace(/\[type]/g, normalizedType)
            .replace(/\[column]/g, column);
        });

        differ.define('table', {
          name: table,
          columns: [{ name: column, type: normalizedType }],
        });

        return exports.expectSyncResult(differ.sync(), expectQuery);
      });
      return exports.alterColumnType({ table, column, type, expect }, differ);
    },
  };
};
