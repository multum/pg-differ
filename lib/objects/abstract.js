/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const parser = require('../parser');
const helpers = require('../helpers');

class AbstractObject {
  constructor(differ, properties) {
    this._differ = differ;
    this.properties = properties;

    const [schema, name] = parser.name(properties.name);
    this._identifier = {
      schema: schema ? helpers.removeQuotes(schema) : schema,
      name: helpers.removeQuotes(name),
    };
  }

  _getSchemaName() {
    return this._identifier.schema || this._differ._defaultSchema;
  }

  getObjectName() {
    return `${this._getSchemaName()}.${this._identifier.name}`;
  }

  getQuotedObjectName() {
    const schema = helpers.addQuotes(this._getSchemaName());
    const name = helpers.addQuotes(this._identifier.name);
    return `${schema}.${name}`;
  }
}

module.exports = AbstractObject;
