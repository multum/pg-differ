/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const { Client } = require('pg');

module.exports = function PostgresClient(connectionConfig, { reconnection }) {
  let client;

  const connect = (attempt = 0) => {
    client = new Client(connectionConfig);
    return _connect(attempt);
  };

  const _connect = attempt =>
    client.connect().catch(error => {
      if (reconnection && attempt < reconnection.attempts) {
        console.error(error.message);
        return retry(attempt);
      } else {
        throw error;
      }
    });

  const retry = async attempt => {
    const { delay } = reconnection;
    console.info(
      `Reconnection attempt [ ${(attempt += 1)} ] will be in ${delay} seconds.`
    );
    await end();
    return new Promise(resolve => {
      setTimeout(() => resolve(connect(attempt)), reconnection.delay);
    });
  };

  const end = async () => {
    if (client) {
      await client.end();
    }
    // eslint-disable-next-line require-atomic-updates
    client = null;
  };

  const query = async (sql, params = []) => {
    !client && (await connect());
    return client.query(sql, params);
  };

  const _instance = {
    end,
    query,
  };

  return Object.freeze(_instance);
};
