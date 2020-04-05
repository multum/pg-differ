'use strict';

const { spawn } = require('child_process');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const Differ = require('../lib');
const connectionConfig = require('./pg.config');

const rootPath = path.join(__dirname, '..');

const getUtils = () => {
  const utils = {};
  beforeAll(() => {
    utils.client = new Client(connectionConfig);
    return utils.client.connect();
  });
  afterAll(() => {
    return utils.client.end();
  });
  return utils;
};

const getDiffer = (options) => {
  return new Differ({ connectionConfig, ...options });
};

const execute = (processPath, args = []) => {
  const childProcess = spawn('node', [processPath, ...args]);
  return new Promise((resolve, reject) => {
    childProcess.stderr.once('data', (error) => {
      reject(error.toString());
    });
    childProcess.on('error', reject);
    childProcess.on('close', (code) => {
      return code === 0 ? resolve() : reject();
    });
    // childProcess.stdout.pipe(concat(console.info));
  });
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
  getUtils,
  getDiffer,
  execute,
  rmdirSync,
};
