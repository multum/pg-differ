'use strict';

const SCHEMAS = {
  DEFAULT: 'differ_test_schema',
};

exports.TABLES = {
  USERS: `${SCHEMAS.DEFAULT}.users`,
  ROLES: `${SCHEMAS.DEFAULT}.roles`,
};

exports.SEQUENCES = {
  USERS: `${SCHEMAS.DEFAULT}.users_id_seq`,
  ROLES: `${SCHEMAS.DEFAULT}.roles_id_seq`,
};

exports.SCHEMAS = SCHEMAS;
