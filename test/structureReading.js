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
    differ.define.table({
      name: 'users',
      columns: [
        { name: 'id', type: 'bigint', autoIncrement: true, primaryKey: true },
        { name: 'age', type: 'smallint', default: 18 },
        { name: 'description', type: 'varchar(255)', default: 'some user' },
        { name: 'deleted', type: 'bool', default: false },
        { name: 'valid', type: 'bool', default: true },
        { name: 'document', type: 'json', default: { type: 'passport', properties: {} } },
      ],
      seeds: [
        { id: 1, description: 'first user' },
        { id: 2, description: 'second user' },
        { id: 3, description: 'third user' },
        { id: 4, description: 'fourth user' },
      ],
    })

    await differ.sync()

    {
      // column check
      const users = await differ.read.table({ name: 'public.users' })
      const columnExpect = (properties) => expect(
        users.columns.find((col) => col.name === properties.name),
      ).to.deep.include(properties)

      expect(users).to.be.a('object')
      expect(users.columns).of.length(6)
      columnExpect({ name: 'id', type: 'bigint' })
      columnExpect({ name: 'document', default: { type: 'passport', properties: {} } })
      //
    }

    // seed check
    if (await differ._supportSeeds()) {
      const users = await differ.read.table({
        name: 'public.users',
        seeds: { orderBy: 'id', range: [ 2, 10 ] },
      })
      const withAllSeeds = await differ.read.table({
        name: 'public.users',
        seeds: true,
      })
      const seedExpect = (number, properties) => expect(
        users.seeds[number - 1],
      ).to.deep.include(properties)

      expect(users.seeds).of.length(3)
      expect(withAllSeeds.seeds).of.length(4)
      seedExpect(3, {
        id: '4',
        description: 'fourth user',
        age: 18, // default value
        document: { type: 'passport', properties: {} }, // default value
      })
    }
  })

  it('sequence', async function () {
    const properties = { name: 'public.users_id_seq', start: '10', min: '10', max: '20' }
    differ.define.sequence(properties)

    await differ.sync()
    const sequence = await differ.read.sequence({ name: properties.name })

    expect(sequence).to.be.a('object')
    expect(sequence).to.include(properties)
  })

  it('catching entity type error', async function () {
    try {
      await differ.read.table({ name: null })
    } catch (e) {
      return true
    }
    throw new Error('the error is not caught')
  })

  it('undefined table', async function () {
    const undefinedTable = await differ.read.table({ name: 'public.undefined_table' })
    return expect(undefinedTable).to.be.undefined
  })
})
