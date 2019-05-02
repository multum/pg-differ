const Differ = require('../..')
const connectionConfig = require('../pg.config')
const logging = Boolean(process.env.TEST_LOGGING)

describe('schema validation', () => {
  it('catching schema validation errors', async function (done) {
    this.timeout(20000)

    const differ = new Differ({
      connectionConfig,
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
      connectionConfig,
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
