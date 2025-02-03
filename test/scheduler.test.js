const test = require('ava')
const log = require('util').debuglog('gametra')

const {setTimeout} = require('node:timers/promises')

const {Scheduler} = require('../src/driver/scheduler')
const {
  Action,
  ThrottledPerformer
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
  class TestAction extends Action {
    async _perform () {
      await setTimeout(100)
    }
  }

  const action = new TestAction()

  const scheduler = new Scheduler()
  .on('idle', add => {
    add(action)
  })

  await t.throwsAsync(async () => Promise.all([
    scheduler.start(),
    scheduler.start()
  ]), {
    message: /twice/
  })
})


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

  // console.log('go fork')

  fork()
  // Give time for forkCondition to return true
  await setTimeout(110)
  const currentCount = count

  // The forked scheduler should only run once,
  // even after a lot of time
  await setTimeout(500)

  t.is(forkedCount, 1)

  scheduler.pause()
  scheduler.pauseMonitors()
})
