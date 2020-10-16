/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const { Client } = require('pg');

class ConnectionManager {
  static getClient(config) {
    return new Client(config);
  }

  static async transaction(client, callback, enable = true) {
    let result;
    if (enable) {
      await client.query('begin');
      try {
        result = await callback();
      } catch (e) {
        await client.query('rollback');
        throw e;
      }
      await client.query('commit');
    } else {
      result = await callback();
    }
    return result;
  }
}

module.exports = ConnectionManager;
