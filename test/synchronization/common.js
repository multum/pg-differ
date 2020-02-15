'use strict';

const helpers = require('../helpers');

exports.describeIndexOrConstraintTest = (type, firstStage, secondStage) => {
  describe(type, () => {
    it(`should create a table and add '${type}'`, function() {
      return helpers.alterObject(
        'table',
        {
          properties: firstStage.properties.map(props => ({
            name: props.name,
            columns: props.columns,
          })),
          syncOptions: { force: true },
          ignoreResultCheck: true,
        },
        {
          properties: firstStage.properties,
          expectQueries: firstStage.expectQueries,
        }
      );
    });

    it(`should drop unnecessary '${type}'`, function() {
      const cleanable = { [type]: true };
      return helpers.alterObject(
        'table',
        {
          properties: firstStage.properties,
          syncOptions: { force: true },
          ignoreResultCheck: true,
        },
        {
          properties: firstStage.properties,
          syncOptions: { cleanable },
          expectQueries: [],
        },
        {
          properties: secondStage.properties,
          syncOptions: { cleanable },
          expectQueries: secondStage.expectQueries,
        }
      );
    });
  });
};
