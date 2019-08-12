const Differ = require('../')
const connectionConfig = require('./pg.config')

describe('reconnection', () => {
  const differ = new Differ({
    schemaFolder: null,
    connectionConfig: {
      ...connectionConfig,
      database: connectionConfig.database + '_not_exists', // will be a reconnection
    },
    reconnection: { attempts: 2, delay: 500 },
  })
  it('error after 2 attempts', async function () {
    this.timeout(5000)
    try {
      differ.define.table({
        name: 'users',
        columns: [ { name: 'id', type: 'smallint' } ],
      })

      await differ.sync()
    } catch (e) {
      return true
    }

    throw new Error('test error')
  })
})
