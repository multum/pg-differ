'use strict';

const { SCHEMAS } = require('./objects');
const differ = require('./helpers').createInstance();

let start;
before(async () => {
  for (const schema of Object.values(SCHEMAS)) {
    await differ._client.query(`create schema if not exists ${schema}`);
  }
  await differ._client.end();
  start = Date.now();
});

after(async () => {
  console.info(`Total time: ${Date.now() - start}`);
  for (const schema of Object.values(SCHEMAS)) {
    await differ._client.query(`drop schema if exists ${schema} cascade`);
  }
  return differ._client.end();
});
