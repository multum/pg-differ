'use strict';

const fs = require('fs');
const path = require('path');
const uuid = require('uuid');

const helpers = require('./helpers');

const root = path.join(__dirname, '__temp__');

const cleanup = () => {
  helpers.rmdirSync(root, { recursive: true });
};

const allocateSpace = () => {
  const allocatedDir = path.join(root, uuid.v4());
  beforeAll(() => {
    fs.mkdirSync(allocatedDir, { recursive: true });
  });
  afterEach(() => {
    fs.readdirSync(allocatedDir).forEach((file) => {
      const currentPath = path.join(allocatedDir, file);
      if (fs.lstatSync(currentPath).isDirectory()) {
        helpers.rmdirSync(currentPath, { recursive: true });
      } else {
        fs.unlinkSync(currentPath);
      }
    });
  });
  afterAll(() => {
    helpers.rmdirSync(allocatedDir, { recursive: true });
  });

  const dir = () => {
    const directory = path.join(allocatedDir, uuid.v4());
    fs.mkdirSync(directory, { recursive: true });
    return { path: allocatedDir };
  };

  const file = ({ data, ext, encoding = 'utf-8' }) => {
    const file = path.join(allocatedDir, `${uuid.v4()}.${ext}`);
    fs.writeFileSync(file, data, encoding);
    return {
      path: file,
    };
  };

  const json = (options) => {
    options = { space: null, ext: 'json', ...options };
    const data = JSON.stringify(options.data, null, options.space);
    return file({ data, ext: options.ext });
  };

  return {
    root: allocatedDir,
    dir,
    file,
    json,
  };
};

module.exports = { cleanup, allocateSpace };
