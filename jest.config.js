'use strict';

const config = {
  testEnvironment: 'node',
  globalSetup: './test/setup.js',
  globalTeardown: './test/teardown.js',
  coverageReporters: ['lcov', 'text-summary'],
};

module.exports = config;
