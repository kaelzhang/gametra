const test = require('ava')
const log = require('util').debuglog('gametra')

const {
  setTimeout
} = require('node:timers/promises')

const {Pausable} = require('../src/driver/events')


test('pausable', async t => {
  const pausable = new Pausable()

  pausable.pause()
  const promise = pausable.waitPause()
  pausable.pause()
  pausable.resume()

  // It could be solved
  await promise

  t.is(pausable.paused, false)
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

  const result = await pausable.emit('foo', 10)

  t.is(result, true)
  t.is(foo, 10)
  t.is(bar, 11)
  t.is(baz, 12)

  pausable.pause()
  pausable.pause()

  const promise = pausable.emit('foo', 100).then(result => {
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

  t.is(await pausable.emit('foo', 1000), true)
  t.is(foo, 1006)
  t.is(bar, 104)
  t.is(baz, 1007)

  pausable.removeAllListeners('foo')

  t.is(await pausable.emit('foo', 10000), false)
  t.is(foo, 1006)
  t.is(bar, 104)
  t.is(baz, 1007)

  pausable.removeAllListeners()

  t.is(await pausable.emit('foo', 10000), false)
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

  await pausable.emit('foo')
})
