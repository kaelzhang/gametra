const test = require('ava')
const log = require('util').debuglog('gametra')

const {setTimeout} = require('node:timers/promises')

const {
  Action,
  IntervalPerformer,
  ThrottledPerformer
} = require('..')


test('not implemented', t => {
  const action = new Action()
  t.throws(() => action._perform(), {
    name: 'NotImplementedError'
  })
})


test('basic action', async t => {
  class TestAction extends Action {
    async _perform (foo) {
      return foo + 1
    }
  }

  const action = new TestAction()
  const result = await action.perform(2)

  t.is(result, 3)
})

test('partial', async t => {
  class TestAction extends Action {
    static REQUIRED_ARGS = 1

    async _perform () {
      return 2
    }
  }

  await t.throwsAsync(() => new TestAction().perform(), {
    message: /requires 1 arguments/
  })

  const action = new TestAction().partial(1)
  const result = await action.perform()

  t.is(result, 2)
})


test('_cancel', async t => {
  class TestAction extends Action {
    #canceled = false

    async _perform () {
      await setTimeout(100)
      return this.#canceled
        ? 3
        : 2
    }

    _cancel () {
      this.#canceled = true
      return 3
    }
  }

  const action = new TestAction()

  let resolved
  action.perform().then(result => {
    resolved = result
  })

  await setTimeout(1)
  t.is(await action.cancel(), 3)

  await setTimeout(100)
  t.is(resolved, 3)
})

test('action pause', async t => {
  class TestAction extends Action {
    async _perform () {
      await setTimeout(100)
      await this.waitPause()
      return 1
    }
  }

  const start = Date.now()
  let resolved
  let timeCost

  const action = new TestAction()
  action.perform().then(result => {
    resolved = result
    timeCost = Date.now() - start
  })

  action.pause()
  t.true(action.paused)

  await setTimeout(100)
  t.is(resolved, undefined)

  await setTimeout(100)
  action.resume()

  await setTimeout(100)
  t.is(resolved, 1)
  t.true(timeCost >= 200)
})
