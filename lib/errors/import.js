/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const BaseError = require('./base');

class ImportError extends BaseError {
  constructor(message, path) {
    super(message);
    this.name = 'DifferImportError';
    this.path = path;
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ImportError;
