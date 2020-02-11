/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const { Client } = require('pg');
const utils = require('./utils');

class ConnectionManager {
  constructor(connectionConfig, { reconnection, logger }) {
    this._connectionConfig = connectionConfig;
    this._reconnection = reconnection;
    this._logger = logger;
    this.client = null;
  }

  connect(attempt = 0) {
    this.client = new Client(this._connectionConfig);
    return this._connect(attempt);
  }

  _connect(attempt) {
    return this.client.connect().catch(error => {
      if (this._reconnection && attempt < this._reconnection.attempts) {
        return this._retry(error, attempt);
      } else {
        throw error;
      }
    });
  }

  _retry(error, attempt) {
    const { delay } = this._reconnection;
    attempt += 1;
    this._logger.error(error.message);
    this._logger.info(
      `Reconnection attempt [ ${attempt} ] will be in ${delay} seconds.`
    );
    return this.end()
      .then(() => utils.delay(delay))
      .then(() => this.connect(attempt));
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
}

module.exports = ConnectionManager;
