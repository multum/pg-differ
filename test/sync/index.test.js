const Differ = require('../..')
const path = require('path')
const dbConfig = require('../pg.config')

const config = {
  dbConfig,
  logging: true,
  schemaFolder: path.resolve(__dirname, 'schemas'),
}

describe('sync', () =>
  it('must be synchronized schemas from the folder "schemas"', async function () {
    this.timeout(20000)

    const differ = new Differ(config)
    await differ.sync()
  }),
)
