const test = require('ava')
const {
  log
} = require('../src/util')

const {setTimeout} = require('node:timers/promises')

const {
  Action,
  ThrottledPerformer: OriginalThrottledPerformer
} = require('..')


class ThrottledPerformer extends OriginalThrottledPerformer {
  static DEFAULT_OPTIONS = {
    throttle: 200
  }
}

test('normal action performing', async t => {
  class TestAction extends Action {
    static PERFORMER = ThrottledPerformer

    async _perform () {
      return 1
    }
  }

  const action = new TestAction()
  const result = await action.perform()

  t.is(result, 1)
})


test('throttled action performing', async t => {
  const performTimes = []

  class TestAction extends Action {
    static PERFORMER = ThrottledPerformer

    async _perform () {
      performTimes.push(Date.now())
      return 1
    }
  }

  const action = new TestAction()
  const start = Date.now()
  await Promise.all([
    action.perform(),
    action.perform(),
    action.perform()
  ])

  let passed = true

  log('performTimes', performTimes.map(t => t - start))

  performTimes.reduce((prev, current) => {
    if (current - prev < 198) {
      passed = false
    }
  })

  t.true(passed)
})


test('throttled action cancel', async t => {
  const performTimes = []

  class TestAction extends Action {
    static PERFORMER = ThrottledPerformer

    async _perform () {
      performTimes.push(Date.now())
      return 1
    }
  }

  const action = new TestAction()
  action.perform()
  action.cancel()

  t.is(performTimes.length, 0)
})

test('action performs after throttle time', async t => {
  let last = Date.now()

  class TestAction extends Action {
    static PERFORMER = ThrottledPerformer

    async _perform () {
      const now = Date.now()
      const cost = now - last
      last = now
      return cost
    }
  }

  const action = new TestAction()
  await action.perform()

  await setTimeout(201)

  last = Date.now()

  const cost = await action.perform()

  t.true(cost < 202)
})


test('throttled action options', async t => {
  let count = 0

  class TestAction extends Action {
    static PERFORMER = ThrottledPerformer

    async _perform () {
      count ++
    }
  }

  const action = new TestAction().options({throttle: 200})

  action.perform()
  action.perform()
  action.perform()
  action.perform()

  await setTimeout(1)
  t.is(count, 1)

  await setTimeout(100)
  t.is(count, 1)

  await setTimeout(150) // + 250
  t.is(count, 2)

  await setTimeout(250) // + 500
  t.is(count, 3)
})


test('mode', async t => {
  let count = 0

  class TestAction extends Action {
    static PERFORMER = ThrottledPerformer

    async _perform () {
      count ++
      return 1
    }
  }

  const action = new TestAction().options({
    throttle: 200,
    throttleMode: 'ignore'
  })

  const result = await Promise.all([
    action.perform(),
    action.perform(),
    action.perform()
  ])

  t.is(count, 1)
  t.deepEqual(result, [1, undefined, undefined])

  const action2 = new TestAction().options({
    throttle: 200,
    throttleMode: 'cache'
  })

  const result2 = await Promise.all([
    action2.perform(),
    action2.perform(),
    action2.perform()
  ])

  t.is(count, 2)
  t.deepEqual(result2, [1, 1, 1])

  const action3 = new TestAction().options({
    throttle: 200,
    throttleMode: 'queue'
  })

  const result3 = await Promise.all([
    action3.perform(),
    action3.perform(),
    action3.perform()
  ])

  t.is(count, 5)
  t.deepEqual(result3, [1, 1, 1])
})


test('throttled last accessor unexpected load', async t => {
  const LAST_CHECKED_KEY = Symbol('lastChecked')

  let loaded = 0

  class TestAction extends Action {
    static PERFORMER = ThrottledPerformer
    static PERFORMER_OPTIONS = {
      throttleMode: 'ignore',
      throttle: 100,
      throttleLastAccessor: {
        async get () {
          let lastChecked = this[LAST_CHECKED_KEY]

          if (!lastChecked) {
            await setTimeout(100)
            lastChecked = Date.now() - 200
            loaded ++
          }

          return lastChecked
        },

        async set (value, delegate) {
          await setTimeout(100)

          this[LAST_CHECKED_KEY] = value
        }
      }
    }

    _perform () {
      return true
    }
  }

  const action = new TestAction()

  const result = await Promise.all([
    action.perform(),
    action.perform(),
    action.perform(),
    action.perform()
  ])

  let u

  t.deepEqual(result, [true, u, u, u])

  t.is(loaded, 1)
})
