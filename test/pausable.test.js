const test = require('ava')
const log = require('util').debuglog('gametra')

const {
  setTimeout
} = require('node:timers/promises')
const {inspect} = require('node:util')

const {Pausable} = require('../src/driver/pausable')
const {
  DO_EMIT,
  DO_EMIT_ASYNC
} = require('../src/constants')


test('pausable', async t => {
  const pausable = new Pausable()

  pausable.pause()
  const promise = pausable.waitPause()
  pausable.pause()
  pausable.resume()

  t.is(inspect(pausable), '[Pausable: no-name]')

  // It could be solved
  await promise

  t.is(pausable.paused, false)
})


test('pausable: events when paused', async t => {
  let count = 0

  const pausable = new Pausable()
  .on('foo', () => {
    count ++
  })

  pausable.pause()
  pausable[DO_EMIT]('foo')

  t.is(count, 0)

  pausable.resume()

  t.is(count, 1)
})


test('pausable events', async t => {
  const pausable = new Pausable()

  let count = 0
  let foo
  let bar
  let baz

  pausable.on('foo', n => {
    foo = n + count ++
  })

  const barHandler = async n => {
    bar = n + count ++
    await setTimeout(100)
  }

  pausable.on('foo', barHandler)

  pausable.on('foo', async n => {
    await setTimeout(200)
    baz = n + count ++
  })

  const result = await pausable[DO_EMIT_ASYNC]('foo', 10)

  t.is(result, true)
  t.is(foo, 10)
  t.is(bar, 11)
  t.is(baz, 12)

  pausable.pause()
  pausable.pause()

  const promise = pausable[DO_EMIT_ASYNC]('foo', 100).then(result => {
    t.is(result, true)
    t.is(foo, 103)
    t.is(bar, 104)
    t.is(baz, 105)
  })

  t.is(foo, 10)
  t.is(bar, 11)
  t.is(baz, 12)

  pausable.resume()
  pausable.resume()

  await promise

  pausable.off('foo', barHandler)

  t.is(await pausable[DO_EMIT_ASYNC]('foo', 1000), true)
  t.is(foo, 1006)
  t.is(bar, 104)
  t.is(baz, 1007)

  pausable.removeAllListeners('foo')

  t.is(await pausable[DO_EMIT_ASYNC]('foo', 10000), false)
  t.is(foo, 1006)
  t.is(bar, 104)
  t.is(baz, 1007)

  pausable.removeAllListeners()

  t.is(await pausable[DO_EMIT_ASYNC]('foo', 10000), false)
  t.is(foo, 1006)
  t.is(bar, 104)
  t.is(baz, 1007)
})

test('pausable error', async t => {
  const pausable = new Pausable()

  pausable.on('foo', () => {
    throw new Error('test')
  })

  pausable.on('error', error => {
    t.is(error.error.message, 'test')
    t.is(error.host, pausable)
  })

  await pausable[DO_EMIT_ASYNC]('foo')
})
