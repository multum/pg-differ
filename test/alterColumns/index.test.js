const Differ = require('../..')
const dbConfig = require('../pg.config')
const logging = Boolean(process.env.TEST_LOGGING)

describe('alter columns', () => {
  it('sync schemas and seeds', async function () {
    this.timeout(20000)

    const differ = new Differ({
      dbConfig,
      logging: logging && console.info,
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
        { name: 'id', type: 'bigint', primaryKey: true, nullable: true },
        { name: 'new_age', type: 'bigint', formerNames: [ 'age' ] },
      ],
    })

    await differ.sync()
  })
})
