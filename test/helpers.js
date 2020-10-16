'use strict';

const { spawn } = require('child_process');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const connectionConfig = require('./pg.config');
const Differ = require('../');

const rootPath = path.join(__dirname, '..');

const getConnection = () => {
  const connection = {};
  beforeAll(() => {
    connection.client = new Client(connectionConfig);
    connection.client._querySpy = jest.spyOn(connection.client, 'query');
    return connection.client.connect();
  });
  afterEach(() => {
    connection.client._querySpy.mockClear();
  });
  afterAll(() => {
    return connection.client.end();
  });
  return connection;
};

const getDiffer = (options) => {
  return new Differ({ connectionConfig, ...options });
};

const execute = (processPath, args = [], logger) => {
  const childProcess = spawn('node', [processPath, ...args]);
  return new Promise((resolve, reject) => {
    childProcess.on('error', reject);
    childProcess.on('close', (code) => {
      return code === 0 ? resolve() : reject();
    });
    childProcess.stderr.once('data', (error) => reject(error.toString()));
    if (logger) {
      childProcess.stdout.on('data', (data) => logger(data.toString()));
    }
  });
};

const readJSON = (...pathChunks) => {
  return JSON.parse(fs.readFileSync(path.join(...pathChunks), 'utf-8'));
};

/**
 * Recursive fs.rmdirSync
 * @param {string} target
 * @param {Object} options
 * @param {boolean} options.recursive
 */
const rmdirSync = (target, options = {}) => {
  if (fs.existsSync(target)) {
    if (options.recursive) {
      fs.readdirSync(target).forEach((file) => {
        const currentPath = path.join(target, file);
        if (fs.lstatSync(currentPath).isDirectory()) {
          rmdirSync(currentPath, options);
        } else {
          // delete file
          fs.unlinkSync(currentPath);
        }
      });
    }
    fs.rmdirSync(target);
  }
};

module.exports = {
  rootPath,
  getConnection,
  getDiffer,
  execute,
  readJSON,
  rmdirSync,
};
