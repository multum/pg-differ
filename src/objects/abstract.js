/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const parser = require('../parser');

class AbstractObject {
  constructor(differ, properties) {
    this._differ = differ;
    this._client = differ._client;
    this.properties = properties;

    const [schema, name] = parser.name(properties.name);
    this._path = { schema, name };
  }

  getFullName() {
    return `${this.getSchemaName()}.${this.getObjectName()}`;
  }

  getSchemaName() {
    return this._path.schema || this._differ.defaultSchema;
  }

  getObjectName() {
    return this._path.name;
  }
}

module.exports = AbstractObject;
