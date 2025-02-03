const test = require('ava')
const log = require('util').debuglog('gametra')

const {setTimeout} = require('node:timers/promises')

const {Whenever} = require('../src/driver/scheduler')

test('whenever', async t => {
  let count = 0

  let checked = false
  let checkPromise

  const whenever = new Whenever(async () => {
    await setTimeout(50)

    if (checkPromise) {
      await checkPromise
    }

    const result = checked
    checked = false
    return result
  })
  .then(() => {
    count ++
  })

  whenever.start()

  await setTimeout(100)

  t.is(count, 0)

  checked = true

  await setTimeout(100)

  t.is(count, 1)

  // Whenever will be paused automatically
  // after `then`

  await setTimeout(100)

  // But it is paused
  t.is(count, 1)

  // Create the situation that whenever pauses during `when`
  const {promise, resolve} = Promise.withResolvers()
  checkPromise = promise

  // pass `await this.waitPause()`
  whenever.resume()

  await setTimeout(100)
  // Now at `await checkPromise`

  whenever.pause()
  checked = true
  // pass `await checkPromise`
  resolve()

  // However, the while block continues

  await setTimeout(100)

  whenever.resume()

  await setTimeout(100)

  t.is(count, 1)

  checked = true

  await setTimeout(100)

  t.is(count, 2)
})
