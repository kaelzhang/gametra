const test = require('ava')

const {setTimeout} = require('node:timers/promises')
const {join} = require('node:path')
const fs = require('node:fs/promises')

const {SimpleJsonStorage} = require('..')


test('storage', async t => {
  const filepath = join(__dirname, 'fixtures', '.storage.json')
  await fs.writeFile(filepath, '{}')

  const storage = new SimpleJsonStorage({
    filepath
  })

  const results = await Promise.all([
    storage.save({a: 1}),
    storage.update(value => {
      value.a = 2
      return value
    }),
    storage.load()
  ])

  console.log('results', results)

  t.deepEqual(
    results,
    [
      {a: 1},
      {a: 2},
      {a: 2}
    ]
  )
})
