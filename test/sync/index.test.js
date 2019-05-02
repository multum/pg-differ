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
      type: 'table',
      properties: {
        name: 'public.blogs',
        cleanExtensions: {
          'unique': true,
          'foreignKey': true,
          'index': true,
          'primaryKey': true,
        },
        columns: [
          {
            'name': 'id',
            'type': 'bigint',
            'nullable': true,
            'autoIncrement': { 'start': 1 },
          },
          {
            'name': 'deleted',
            'type': 'bool',
          },
        ],
      },
    })

    await differ.sync()
  })

  it('force sync', async function () {
    this.timeout(20000)
    const differ = new Differ({
      dbConfig,
      logging,
    })
    differ.define({
      type: 'table',
      properties: {
        name: 'children',
        force: true,
        foreignKeys: [
          {
            'columns': [ 'parent' ],
            'references': {
              'table': 'users',
              'columns': [ 'description' ],
            },
          },
        ],
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
            'default': 18,
          },
          {
            'name': 'parent',
            'type': 'varchar(255)',
          },
        ],
      },
    })
    await differ.sync()
  })
})
