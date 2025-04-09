const test = require('ava')
const {inspect} = require('node:util')

const {setTimeout} = require('node:timers/promises')

const {
  Action,
  createAction,
  Scheduler,
  IntervalPerformer
} = require('..')


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
  .name('main')

  t.is(inspect(scheduler), '[Scheduler: main]')

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

  t.is(inspect(forked), '[Scheduler: no-name]')

  // Run tests
  /////////////////////////////////////

  scheduler.start()
  scheduler.pause()

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
  await setTimeout(500)

  // The forked scheduler should only run once,
  // even after a lot of time
  t.is(forkedCount, 1)

  scheduler.resume()

  // Try to fork again
  fork()
  // Give time for forkCondition to return true
  await setTimeout(500)

  // The forked scheduler should only run once,
  // even after a lot of time
  t.is(forkedCount, 2)

  scheduler.pause()
})


test('scheduler error', async t => {
  class ErrorAction extends Action {
    async _perform () {
      throw new Error('test')
    }
  }

  const scheduler = new Scheduler({
    master: false
  })
  .on('error', payload => {
    t.is(payload.type, 'action-error')
    t.is(payload.error.message, 'test')
  })
  .on('idle', add => {
    add(new ErrorAction())
  })

  await scheduler.start()
})


test('scheduler whenever error', async t => {
  const scheduler = new Scheduler({
    master: false
  })
  .on('error', payload => {
    t.is(payload.type, 'whenever-error')
    t.is(payload.error.message, 'test')
  })

  class ForkedAction extends Action {
    async _perform () {
      await setTimeout(10)
      throw new Error('test')
    }
  }

  const forkedAction = new ForkedAction()

  scheduler.resume()
  scheduler.start()

  // Test fork a scheduler after the scheduler is started
  scheduler.fork(forkedAction)

  await setTimeout(200)
  scheduler.pause()
})


test.only('forked scheduler error', async t => {
  const {
    promise: forkedPromise,
    resolve: resolveForked
  } = Promise.withResolvers()

  const {
    promise: backPromise,
    resolve: resolveBack
  } = Promise.withResolvers()

  class ErrorAction extends Action {
    async _perform () {
      resolveForked()
      throw new Error('test')
    }
  }

  class IntervalAction extends Action {
    static PERFORMER = IntervalPerformer

    async _perform () {
      await setTimeout(100)
    }
  }

  const intervalAction = new IntervalAction()

  const errorAction = new ErrorAction()

  const scheduler = new Scheduler({
    master: false
  })
  .on('error', payload => {
    t.is(payload.type, 'action-error')
    t.is(payload.error.message, 'test')
    t.is(payload.scheduler, forked)
  })
  .on('idle', add => {
    add(intervalAction)
  })

  let shouldFork = false
  let exitCount = 0

  const forked = scheduler.fork(async () => {
    const result = shouldFork
    shouldFork = false
    return result
  }, {
    async onBack (perform) {
      await perform(createAction(() => {
        exitCount ++
      }))
      resolveBack()
    }
  })
  .on('start', add => {
    add(errorAction)
  })

  const fork = () => {
    shouldFork = true
  }

  fork()

  scheduler.start()

  await forkedPromise
  await backPromise
  t.is(exitCount, 1)
  scheduler.pause()
})
