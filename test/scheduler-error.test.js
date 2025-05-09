const test = require('ava')

const {setTimeout} = require('node:timers/promises')

const {
  Action,
  Scheduler,
  createAction
} = require('..')


test('ok to start master scheduler twice', async t => {
  const scheduler = new Scheduler()

  scheduler.start()
  scheduler.start()

  t.pass()
})


test('master scheduler should not exit', t => {
  const scheduler = new Scheduler()

  t.throws(() => {
    scheduler.exit(() => true)
  }, {
    message: /master/
  })
})


test('scheduler fork condition error', async t => {
  class MyForkAction extends Action {
    async _perform (game) {
      await Promise.all(
        [1].map(n => this.#error(n))
      )
    }

    #error (n) {
      throw new Error(`test ${n}`)
    }
  }

  const forkAction = new MyForkAction()

  class MyAction extends Action {
    async _perform (game) {
      await setTimeout(100)
    }
  }

  const action = new MyAction()

  let forkError

  const scheduler = new Scheduler()
  .on('idle', add => {
    add(action)
  })
  .on('error', ({error}) => {
    forkError = error
  })

  scheduler.fork(forkAction)

  scheduler.start()

  await setTimeout(200)

  t.is(forkError.message, 'test 1')

  scheduler.pause()
})

test('scheduler async event error', async t => {
  const errorAction = createAction(() => {
    throw new Error('test')
  })

  let shouldFork = true

  const forkCondition = createAction(() => {
    if (shouldFork) {
      shouldFork = false
      return true
    }

    return false
  })

  const {promise, resolve} = Promise.withResolvers()

  const scheduler = new Scheduler()
  .on('error', errorInfo => {
    const {error, host, type} = errorInfo

    t.is(error.message, 'test')
    t.is(host, errorAction)
    t.is(type, 'action-error')
    resolve()
  })

  scheduler.fork(forkCondition, {
    async onBack (perform) {
      await perform(errorAction)
    }
  })

  scheduler.start()
  await promise
  scheduler.pause()
})


test('scheduler onFork error', async t => {
  const {promise, resolve} = Promise.withResolvers()

  const scheduler = new Scheduler()
  .on('error', ({error, type}) => {
    t.is(error.message, 'test')
    t.is(type, 'onFork-error')
  })

  let forked = false

  scheduler.fork(async () => {
    await setTimeout(10)
    if (forked) {
      return
    }

    forked = true
    return true
  }, {
    async onFork () {
      throw new Error('test')
    },
    onBack: resolve
  })

  scheduler.start()

  await promise
  scheduler.pause()
})
