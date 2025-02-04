const test = require('ava')
const log = require('util').debuglog('gametra')

const {Pausable} = require('../src/util')


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
