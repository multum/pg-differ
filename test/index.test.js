'use strict';

const differ = require('./helpers').createInstance();

let start;
before(async () => {
  await differ._execute([`create schema if not exists "DifferSchema"`]);
  await differ._end();
  start = Date.now();
});

after(async () => {
  console.info(`Total time: ${Date.now() - start}`);
  await differ._execute([`drop schema if exists "DifferSchema" cascade`]);
  return differ._end();
});
