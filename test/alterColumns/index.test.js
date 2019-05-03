const Differ = require('../..')
const connectionConfig = require('../pg.config')
const logging = Boolean(process.env.TEST_LOGGING)

describe('alter columns', () => {
  it('alter columns', async function () {
    const differ = new Differ({
      connectionConfig,
      logging: logging,
    })

    differ.define('table', {
      name: 'users',
      extensions: {
        indexes: [ { columns: [ 'age' ] } ],
      },
      columns: [
        { name: 'id', type: 'smallint', primaryKey: true },
        { name: 'age', type: 'varchar(255)', collate: null },
        { name: 'busy', type: 'varchar(255)', 'default': '1' },
      ],
    })
    await differ.sync()

    differ.define('table', {
      name: 'users',
      extensions: {
        cleanable: { index: true },
      },
      columns: [
        { name: 'id', type: 'bigint', primaryKey: true, nullable: true },
        { name: 'new_age', type: 'bigint', formerNames: [ 'age' ] },
        { name: 'busy', type: 'bool', 'default': true },
      ],
    })
    await differ.sync()
  })
})
