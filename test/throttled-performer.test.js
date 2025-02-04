const test = require('ava')
const log = require('util').debuglog('gametra')

const {setTimeout} = require('node:timers/promises')

const {
  Action
} = require('../src/driver/action')

const {
  ThrottledPerformer: OriginalThrottledPerformer
} = require('../src/driver/performers')


class ThrottledPerformer extends OriginalThrottledPerformer {
  static DEFAULT_OPTIONS = {
    throttle: 200
  }
}

test('normal action performing', async t => {
  class TestAction extends Action {
    static Performer = ThrottledPerformer

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
    static Performer = ThrottledPerformer

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
    static Performer = ThrottledPerformer

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


test('throttled action pause', async t => {
  const start = Date.now()

  class TestAction extends Action {
    static Performer = ThrottledPerformer

    async _perform () {
      return Date.now() - start
    }
  }

  const action = new TestAction()

  let resolved

  action.perform().then(result => {
    resolved = result
  })

  // Call pause before resume, and it should be ok
  action.resume()

  action.pause()
  await setTimeout(100)
  action.resume()

  await setTimeout(1)

  t.true(resolved >= 100)
})


test('action performs after throttle time', async t => {
  let last = Date.now()

  class TestAction extends Action {
    static Performer = ThrottledPerformer

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
