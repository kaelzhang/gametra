const test = require('ava')

const {setTimeout} = require('node:timers/promises')

const {
  Action,
  createAction
} = require('..')

const {Cargo} = require('../src/driver/cargo')
const {EVENT_DRAINED} = require('../src/constants')


test('cargo', async t => {
  let count = 0

  const {promise, resolve} = Promise.withResolvers()

  const action = createAction(async () => {
    await setTimeout(10)
    count++
  })

  const cargo = new Cargo()
  .on(EVENT_DRAINED, () => {
    resolve()
  })

  cargo.pause()
  cargo.add(action)
  await setTimeout(100)
  t.is(count, 0)

  cargo.resume()

  await promise

  t.is(count, 1)
})
