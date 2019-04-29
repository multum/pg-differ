const Differ = require('../..')
const dbConfig = require('../pg.config')
const logging = Boolean(process.env.TEST_LOGGING)

describe('schema validation', () => {
  it('catching schema validation errors', async function (done) {
    this.timeout(20000)

    const differ = new Differ({
      dbConfig,
      logging: logging,
    })

    try {
      differ.define({
        type: 'table',
        properties: {
          columns: [
            { name: 'id', type: 'smallint' },
          ],
        },
      })
    } catch (e) {
      done()
    }
  })

  it('catching schema type error', async function (done) {
    const differ = new Differ({
      dbConfig,
      logging: logging,
    })
    try {
      differ.define({
        type: 't', // invalid type
        properties: {
          columns: [
            { name: 'id', type: 'smallint' },
          ],
        },
      })
    } catch (e) {
      done()
    }
  })
})
