'use strict';

const host = '127.0.0.1',
  port = 5432,
  database = 'postgres',
  user = 'postgres',
  password = 'postgres';

module.exports = {
  connectionString: `postgresql://${user}:${password}@${host}:${port}/${database}`,
};
