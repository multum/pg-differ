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
          { name: 'id', type: 'bigint', autoIncrement: true },
          { name: 'age', type: 'smallint', default: 18 },
          { name: 'description', type: 'varchar(255)' },
          { name: 'deleted', type: 'bool', default: false },
          { name: 'valid', type: 'bool', default: true },
          { name: 'document', type: 'json', default: { type: 'passport', properties: {} } },
        ],
      },
    })

    await differ.sync()
    const users = await differ.read({ type: 'table', name: 'public.users' })

    const findColumn = (name) => users.properties.columns.find((col) => col.name === name)
    const columnExpect = (properties) => expect(findColumn(properties.name)).to.deep.include(properties)

    expect(users).to.be.a('object')
    expect(users.properties.columns).of.length(6)
    columnExpect({ name: 'id', type: 'bigint' })
    columnExpect({ name: 'document', default: { type: 'passport', properties: {} } })
  })

  it('sequence', async function () {
    const properties = { name: 'public.users_id_seq', start: '10', min: '10', max: '20' }
    differ.define({ type: 'sequence', properties })

    await differ.sync()
    const sequence = await differ.read({ type: 'sequence', name: properties.name })

    expect(sequence).to.be.a('object')
    expect(sequence.properties).to.include(properties)
  })

  it('catching entity type error', async function () {
    try {
      await differ.read({ type: 't' })
    } catch (e) {
      return true
    }
    throw new Error('the error is not caught')
  })
})
