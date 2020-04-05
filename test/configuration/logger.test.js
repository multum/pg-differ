'use strict';

const chalk = require('chalk');
const helpers = require('../helpers');

describe(`logging`, () => {
  it(`should change default schema`, async function () {
    const logger = jest.fn();
    const differ = helpers.getDiffer({ logging: logger });
    await differ.sync();
    expect(logger).toHaveBeenCalled();
    expect(logger.mock.calls).toEqual([
      [`Postgres Differ > ${chalk.green('Sync started')}`],
      [`Postgres Differ > Database does not need updating`],
      [`Postgres Differ > ${chalk.green('Sync successful!')}`],
    ]);
  });
});
