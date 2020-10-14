'use strict';

const TempFileStorage = require('./temp-file-storege');

module.exports = async () => {
  TempFileStorage.cleanup();
  const { __pg_client__: client } = global;
  await client.query(`drop schema if exists "DifferSchema" cascade;`);
  return client.end();
};
