'use strict';

const helpers = require('../helpers');

describe('alter column type', () => {
  const alterColumnTypeQuery =
    'alter table [table] alter column [column] type [type]';
  helpers
    .alterColumnType({
      table: 'DifferSchema.users',
      column: 'birthday',
      type: 'varchar(64)',
    })
    .to({
      type: 'varchar(255)',
      expectQuery: [`${alterColumnTypeQuery};`],
    })
    .to({
      type: 'integer',
      expectQuery: [`${alterColumnTypeQuery} using (trim([column])::integer);`],
    })
    .to({
      type: 'boolean',
      expectQuery: [
        `${alterColumnTypeQuery} using (case when [column] = 0 then false else true end);`,
      ],
    })
    .to({
      type: 'integer',
      expectQuery: [`${alterColumnTypeQuery} using ([column]::integer);`],
    })
    .to({
      type: 'varchar(255)',
      expectQuery: [`${alterColumnTypeQuery};`],
    })
    .to({
      type: 'varchar(255)',
      expectQuery: [],
    });
});
