/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const { Client } = require('pg');

class ConnectionManager {
  constructor(connectionConfig) {
    this._connectionConfig = connectionConfig;
    this.client = null;
  }

  connect() {
    this.client = new Client(this._connectionConfig);
    return this.client.connect();
  }

  async end() {
    if (this.client !== null) {
      await this.client.end();
    }
    this.client = null;
  }

  async query(sql, params = []) {
    if (this.client === null) {
      await this.connect();
    }
    return this.client.query(sql, params);
  }

  async transaction(callback, enable) {
    let result;
    if (enable) {
      await this.query('begin');
      try {
        result = await callback();
      } catch (e) {
        await this.query('rollback');
        throw e;
      }
      await this.query('commit');
    } else {
      result = await callback();
    }
    return result;
  }
}

module.exports = ConnectionManager;
