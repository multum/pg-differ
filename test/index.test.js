'use strict';

let start;
before(() => (start = Date.now()));

after(() => console.info(`Total time: ${Date.now() - start}`));

require('./sync');
require('./alterColumns');
require('./reconnection');
require('./schemaValidation');
require('./structureReading');
