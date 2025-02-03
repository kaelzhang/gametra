const test = require('ava')
const log = require('util').debuglog('gametra')

const {setTimeout} = require('node:timers/promises')

const {Scheduler} = require('../src/driver/scheduler')
const {
  Action
} = require('../src/driver/action')


test('a complex case: pause and resume', async t => {
  // Main
  /////////////////////////////////////////
  let count = 0

  class TestAction extends Action {
    async _perform () {
      count ++
      await setTimeout(100)
    }
  }

  const action = new TestAction()

  const scheduler = new Scheduler()
  .on('idle', add => {
    add(action)
  })

  // Forked
  /////////////////////////////////////////
  let forkedCount = 0

  class ActionForForked extends Action {
    async _perform () {
      forkedCount ++
      await setTimeout(100)
    }
  }

  let shouldFork = false

  const forkCondition = async () => {
    const result = shouldFork
    shouldFork = false
    await setTimeout(100)
    return result
  }

  const fork = () => {
    shouldFork = true
  }

  const actionForForked = new ActionForForked()

  const forked = scheduler.fork(forkCondition)
  .on('idle', add => {
    add(actionForForked)
  })

  // Run tests
  /////////////////////////////////////

  scheduler.pause()
  scheduler.start()

  await setTimeout(200)

  // it should still be 0, even after 200ms,
  // because the scheduler is paused
  t.is(count, 0)

  scheduler.resume()
  await setTimeout(100)
  scheduler.pause()

  await setTimeout(200)

  t.is(count, 1)

  scheduler.resume()

  fork()
  // Give time for forkCondition to return true
  await setTimeout(110)
  const currentCount = count

  // The forked scheduler should only run once,
  // even after a lot of time
  await setTimeout(500)

  t.is(forkedCount, 1)

  scheduler.pause()
})


test('scheduler reset', async t => {
  let count = 0

  class TestAction extends Action {
    async _perform () {
      count ++
      await setTimeout(200)
    }
  }

  const action = new TestAction()

  let shouldReset = false
  let reset = false

  const scheduler = new Scheduler({
    master: false
  })
  .on('idle', add => {
    add(action)
  })
  .on('reset', () => {
    reset = true
  })
  .reset(async () => {
    const reset = shouldReset
    shouldReset = false
    await setTimeout(100)
    return reset
  })

  scheduler.start()

  // Sub scheduler is paused by default, so we need to resume it
  scheduler.resume()
  await scheduler.complete()
  t.is(count, 1)

  shouldReset = true
  scheduler.start()
  scheduler.resume()
  await setTimeout(150)

  // After reset, the scheduler should be paused,
  // so we need to resume it
  scheduler.resume()
  t.is(reset, true)

  scheduler.pause()
})

