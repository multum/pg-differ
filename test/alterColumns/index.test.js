const Differ = require('../..')
const dbConfig = require('../pg.config')
const logging = Boolean(process.env.TEST_LOGGING)

describe('alter columns', () => {
  it('sync schemas and seeds', async function () {
    this.timeout(20000)

    const differ = new Differ({
      dbConfig,
      logging,
    })

    differ.define({
      table: 'users',
      force: true,
      columns: [
        { name: 'id', type: 'smallint', primaryKey: true },
        { name: 'age', type: 'varchar(255)' },
      ],
    })

    await differ.sync()

    differ.define({
      table: 'users',
      columns: [
        { name: 'id', type: 'bigint', primaryKey: true },
        { name: 'age', type: 'bigint' },
      ],
    })

    await differ.sync()
  })
})
