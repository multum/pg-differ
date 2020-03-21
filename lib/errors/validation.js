/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const BaseError = require('./base');

class ValidationError extends BaseError {
  constructor({ path, message }) {
    super();
    this.name = 'DifferValidationError';
    path = path ? `${path} > ` : '';
    this.message = `${path}${message}`;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ValidationError;
