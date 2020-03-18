'use strict';

const config = {
  globalSetup: './test/setup.js',
  globalTeardown: './test/teardown.js',
  coverageReporters: ['lcov', 'text-summary'],
};

module.exports = config;
