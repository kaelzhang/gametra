const test = require('ava')
const log = require('util').debuglog('gametra')

const {setTimeout} = require('node:timers/promises')

const {Scheduler} = require('../src/driver/scheduler')
const {
  Action
} = require('../src/driver/action')


test('add outside of an event handler', t => {
  const scheduler = new Scheduler()

  t.throws(() => {
    scheduler.add(new Action())
  }, {
    message: /outside/
  })
})


test('start master scheduler twice', async t => {
  const scheduler = new Scheduler()

  await t.throwsAsync(async () => Promise.all([
    scheduler.start(),
    scheduler.start()
  ]), {
    message: /twice/
  })
})
