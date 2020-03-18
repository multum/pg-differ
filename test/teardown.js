'use strict';

module.exports = async () => {
  const { __pg_client__: client } = global;
  await client.query(`drop schema if exists "DifferSchema" cascade;`);
  return client.end();
};
