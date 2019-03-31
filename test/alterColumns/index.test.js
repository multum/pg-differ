const Differ = require('../..')
const dbConfig = require('../pg.config')
const logging = Boolean(process.env.TEST_LOGGING) || true

describe('alter columns', () => {
  it('alter columns', async function () {
    this.timeout(20000)

    const differ = new Differ({
      dbConfig,
      logging: logging && console.info,
    })

    differ.define({
      table: 'users',
      indexes: [
        { type: 'index', columns: [ 'parent' ] },
      ],
      columns: [
        { name: 'id', type: 'smallint', primaryKey: true },
        { name: 'age', type: 'varchar(255)', collate: 'en_US.UTF-8' },
        { name: 'busy', type: 'varchar(255)', 'default': '1' },
      ],
    })
    await differ.sync()

    differ.define({
      table: 'users',
      forceIndexes: [ 'index' ],
      columns: [
        { name: 'id', type: 'bigint', primaryKey: true, nullable: true },
        { name: 'new_age', type: 'bigint', formerNames: [ 'age' ] },
        { name: 'busy', type: 'bool', 'default': true },
      ],
    })
    await differ.sync()
  })
})
