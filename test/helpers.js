'use strict';

const Differ = require('../src');
const { SCHEMAS } = require('./objects');
const connectionConfig = require('./pg.config');
const logging = Boolean(process.env.LOGGING);

exports.expectError = async resolver => {
  try {
    await resolver();
  } catch (e) {
    return;
  }
  throw new Error('missing expected error');
};

exports.createInstance = options => {
  const instance = new Differ({
    connectionConfig,
    logging,
    ...options,
  });
  instance.setDefaultSchema(SCHEMAS.DEFAULT);
  return instance;
};
