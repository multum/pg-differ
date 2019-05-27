const Differ = require('../..')
const connectionConfig = require('../pg.config')
const logging = Boolean(process.env.TEST_LOGGING)

describe('schema validation', () => {
  it('catching schema validation errors', function (done) {
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

  it('catching schema type error', function (done) {
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

  it('missing constraint error', function (done) {
    const differ = new Differ({
      connectionConfig,
      logging: logging,
    })
    try {
      differ.define({
        type: 'table',
        properties: {
          name: 'some_table',
          columns: [
            { name: 'id', type: 'smallint' },
          ],
          seeds: [ { 'id': 1, 'busy': 'some string with quote \'' } ], // will be a error
        },
      })
    } catch (e) {
      done()
    }
  })
})
