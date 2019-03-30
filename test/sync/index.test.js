const Differ = require('../..')
const path = require('path')
const dbConfig = require('../pg.config')
const logging = Boolean(process.env.TEST_LOGGING)

describe('sync', () => {
  it('sync schemas and seeds', async function () {
    this.timeout(20000)

    const differ = new Differ({
      dbConfig,
      logging,
      schemaFolder: path.resolve(__dirname, 'schemas'),
      seedFolder: path.resolve(__dirname, 'seeds'),
      placeholders: {
        schema: 'public',
      },
    })

    await differ.sync()

    differ.define({
      table: 'blogs',
      forceIndexes: [
        'unique',
        'foreignKey',
        'index',
        'primaryKey',
      ],
      columns: [
        {
          'name': 'id',
          'type': 'bigint',
          'nullable': true,
        },
      ],
    })

    await differ.sync()
  })

  it('force sync', async function () {
    this.timeout(20000)

    const differ = new Differ({
      dbConfig,
      logging,
      force: true,
    })

    differ.define({
      table: 'children',
      columns: [
        {
          'name': 'id',
          'type': 'bigint',
          'unique': true,
          'primaryKey': true,
        },
        {
          'name': 'age',
          'type': 'bigint',
          'default': '18',
        },
        {
          'name': 'parent',
          'type': 'integer',
          'unique': true,
        },
      ],
    })
    await differ.sync()
  })
})
