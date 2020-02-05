/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const BaseError = require('./base');

class ValidationError extends BaseError {
  constructor(errors) {
    super();
    this.name = 'DifferValidationError';
    this.message = 'Validation Error';
    this.errors = errors || [];
    if (this.errors.length > 0 && this.errors[0].message) {
      this.message = this.errors
        .map(e => {
          const path = e.path ? `[ ${e.path} ] ` : '';
          return `${path}(${e.keyword}): ${e.message}`;
        })
        .join(',\n');
    }
    Error.captureStackTrace(this, this.constructor);
  }

  get(path) {
    return this.errors.filter(error => error.path === path);
  }
}

module.exports = ValidationError;
