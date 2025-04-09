const test = require('ava')

const {setTimeout} = require('node:timers/promises')

const {
  Action,
  Scheduler,
  IntervalPerformer
} = require('..')


test('scheduler pause when forked', async t => {
  class TestAction extends Action {
    async _perform () {
      await setTimeout(200)
    }
  }

  const action = new TestAction()

  let count = 0
  let waitPromise

  const {
    promise: forkedActionPromise,
    resolve: resolveForkedAction
  } = Promise.withResolvers()

  class ActionForForked extends Action {
    static PERFORMER = IntervalPerformer
    static PERFORMER_OPTIONS = {
      interval: 10
    }

    async _perform () {
      count ++
      resolveForkedAction()
      if (waitPromise) {
        await waitPromise
      }
    }
  }

  const actionForForked = new ActionForForked()

  let shouldFork = false

  const forkCondition = async () => {
    const result = shouldFork
    await setTimeout(10)
    return result
  }

  const fork = () => {
    shouldFork = true
  }

  const unfork = () => {
    shouldFork = false
  }

  const scheduler = new Scheduler()
  .name('main')
  .on('idle', add => {
    add(action)
  })

  const forked = scheduler.fork(forkCondition)
  .name('forked')
  .on('start', add => {
    add(actionForForked)
  })

  scheduler.start()

  const {promise, resolve} = Promise.withResolvers()
  waitPromise = promise

  fork()

  await forkedActionPromise
  const countBeforePause = count

  scheduler.pause()
  scheduler.resume()
  scheduler.pause()
  waitPromise = null

  // Release the waiter
  resolve()

  // The ActionForForked will be executed repeatly,
  // but it should be paused
  await setTimeout(200)

  t.is(count, countBeforePause)
})


test('scheduler pause with action performers', async t => {
  let count = 0

  class TestAction extends Action {
    static PERFORMER = IntervalPerformer
    static PERFORMER_OPTIONS = {
      interval: 50
    }

    async _perform () {
      count ++
    }
  }

  const action = new TestAction().queue(true)

  const scheduler = new Scheduler()
  .on('idle', add => {
    add(action)
  })

  scheduler.resume()
  scheduler.start()

  await setTimeout(100)
  scheduler.pause()

  await setTimeout(50)
  const current = count

  await setTimeout(200)

  t.is(count, current)
})
