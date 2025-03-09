const test = require('ava')
const log = require('util').debuglog('gametra')

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
  .on('forked', add => {
    add(actionForForked)
  })

  scheduler.start()

  // TODO: why should we need to wait 100 ms here?
  // something potential is wrong here
  // await setTimeout(100)

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
