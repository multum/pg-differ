'use strict';

const host = process.env.POSTGRES_HOST || 'localhost',
  database = process.env.POSTGRES_DATABASE || 'postgres',
  password = process.env.POSTGRES_PASSWORD || 'postgres',
  user = process.env.POSTGRES_USER || 'postgres',
  port = process.env.POSTGRES_PORT || 5432;

module.exports = {
  connectionString: `postgresql://${user}:${password}@${host}:${port}/${database}`,
};
