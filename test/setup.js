'use strict';
const { Client } = require('pg');
const connectionConfig = require('./pg.config');
module.exports = async () => {
  const client = new Client(connectionConfig);
  await client.connect();
  await client.query(`create schema if not exists "DifferSchema"`);
  global.__pg_client__ = client;
};
