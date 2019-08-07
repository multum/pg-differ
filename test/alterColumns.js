const Differ = require('../')
const connectionConfig = require('./pg.config')
const logging = Boolean(process.env.TEST_LOGGING)

describe('alter columns', () => {
  it('alter columns', async function () {
    const differ = new Differ({
      connectionConfig,
      logging: logging,
    })

    differ.define('table', {
      name: 'users',
      indexes: [ { columns: [ 'age' ] } ],
      columns: [
        { name: 'id', type: 'smallint' },
        { name: 'age', type: 'varchar(255)', collate: null },
      ],
    })
    await differ.sync()

    differ.define('table', {
      name: 'users',
      cleanable: {
        indexes: true,
      },
      columns: [
        { name: 'id', type: 'bigint', primaryKey: true },
        { name: 'new_age', type: 'bigint', formerNames: [ 'age' ] },
        { name: 'busy', type: 'bool', default: true },
      ],
    })
    await differ.sync()

    differ.define('table', {
      name: 'users',
      columns: [
        { name: 'busy', type: 'smallint' },
      ],
    })
  })
})
