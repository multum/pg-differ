'use strict';

const Temp = require('./temp');

module.exports = async () => {
  Temp.cleanup();
  const { __pg_client__: client } = global;
  await client.query(`drop schema if exists "DifferSchema" cascade;`);
  return client.end();
};
