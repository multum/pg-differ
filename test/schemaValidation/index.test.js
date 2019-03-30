const Differ = require('../..')
const dbConfig = require('../pg.config')
const logging = Boolean(process.env.TEST_LOGGING)

describe('schema validation', () => {
  it('catching schema validation errors', async function (done) {
    this.timeout(20000)

    const differ = new Differ({
      dbConfig,
      logging: logging && console.info,
    })

    try {
      differ.define({
        table: 1,
        columns: [
          { name: 'id', type: 'smallint' },
        ],
      })
    } catch (e) {
      done()
    }
  })
})
