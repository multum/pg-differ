'use strict';

const helpers = require('../helpers');

exports.indexOrConstraintTest = (type, options) => {
  const title = type
    .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1 $2')
    .toLowerCase();
  describe(title, () => {
    let differ;
    beforeEach(() => {
      differ = helpers.getDiffer();
    });

    it(`should create a table and add "${title}"`, async function () {
      options.properties.forEach(({ name, columns }) => {
        differ.define('table', { name, columns });
      });
      await differ.sync({ force: true });

      options.properties.forEach(({ name, ...other }) => {
        differ.define('table', { name, ...other });
      });

      expect(await differ.sync()).toMatchObject({
        queries: options.expectQueries,
      });
      expect(await differ.sync({ execute: false })).toMatchObject({
        queries: [],
      });
    });

    it(`should drop unnecessary "${title}"`, async function () {
      const allowClean = { [type]: true };

      options.properties.forEach((properties) => {
        differ.define('table', properties);
      });
      await differ.sync({ force: true });

      expect(await differ.sync({ allowClean })).toMatchObject({ queries: [] });

      options.properties.forEach(({ name, columns }) => {
        differ.define('table', { name, columns });
      });

      expect(await differ.sync({ allowClean })).toMatchObject({
        queries: options.expectDropQueries,
      });
      expect(await differ.sync({ execute: false })).toMatchObject({
        queries: [],
      });
    });
  });
};
