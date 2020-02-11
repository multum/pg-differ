'use strict';

const differ = require('./helpers').createInstance();

let start;
before(async () => {
  await differ._client.query(`create schema if not exists "DifferSchema"`);
  await differ._client.end();
  start = Date.now();
});

after(async () => {
  console.info(`Total time: ${Date.now() - start}`);
  await differ._client.query(`drop schema if exists "DifferSchema" cascade`);
  return differ._client.end();
});
