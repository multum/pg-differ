'use strict';

const differ = require('./helpers').createInstance();

let start;
before(async () => {
  await differ.execute([`create schema if not exists "DifferSchema"`]);
  await differ.end();
  start = Date.now();
});

after(async () => {
  console.info(`Total time: ${Date.now() - start}`);
  await differ.execute([`drop schema if exists "DifferSchema" cascade`]);
  return differ.end();
});
