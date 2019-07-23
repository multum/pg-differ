const { expect } = require('chai')
const Differ = require('../')
const connectionConfig = require('./pg.config')

describe('reading structure', function () {
  const differ = new Differ({
    connectionConfig,
    force: true,
    reconnection: false,
    schemaFolder: null,
  })
  it('table', async function () {
    differ.define({
      type: 'table',
      properties: {
        name: 'users',
        columns: [
          { name: 'id', type: 'bigint' },
          { name: 'age', type: 'smallint' },
          { name: 'description', type: 'varchar(255)' },
        ],
      },
    })

    await differ.sync()
    const users = await differ.read({ type: 'table', name: 'public.users' })

    expect(users).to.be.a('object')
    expect(users.properties.columns).of.length(3)
    expect(users.properties.columns).of.length(3)
    expect(users.properties.columns[0]).to.include({ name: 'id', type: 'bigint' })
  })
  it('sequence', async function () {
    const properties = { name: 'public.users_id_seq', start: '10', min: '10', max: '20' }
    differ.define({ type: 'sequence', properties })

    await differ.sync()
    const sequence = await differ.read({ type: 'sequence', name: properties.name })

    expect(sequence).to.be.a('object')
    expect(sequence.properties).to.include(properties)
  })
})
