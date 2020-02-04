'use strict';

let start;
before(() => (start = Date.now()));

after(() => console.info(`Total time: ${Date.now() - start}`));

require('./sync');
require('./alter-columns');
require('./reconnection');
require('./schema-validation');
require('./structure-reading');
