const test = require('ava')
const log = require('util').debuglog('gametra')

const {setTimeout} = require('node:timers/promises')

const {
  Action,
  IntervalPerformer
} = require('../src/driver/action')


test('not implemented', t => {
  const action = new Action()
  t.throws(() => action._perform(), {
    name: 'NotImplementedError'
  })
})


test('performer already running', async t => {
  class TestAction extends Action {
    static Performer = IntervalPerformer

    async _perform () {
      return 1
    }
  }

  const action = new TestAction()
  action.perform()
  await t.throwsAsync(() => action.perform(), {
    message: /already running/
  })
})


test('basic action', async t => {
  class TestAction extends Action {
    async _perform (foo) {
      return foo + 1
    }
  }

  const action = new TestAction()
  const result = await action.perform([2])

  t.is(result, 3)
})

test('action with performer', async t => {
  const start = Date.now()

  class TestAction extends Action {
    static Performer = IntervalPerformer

    async _perform () {
      return Date.now() - start > 300
    }
  }

  const action = new TestAction()
  const result = await action.perform()

  t.true(Date.now() - start > 300)
})

test('test action cancel: will never resolve', async t => {
  const start = Date.now()

  class TestAction extends Action {
    static Performer = IntervalPerformer

    async _perform () {
      return Date.now() - start > 300
    }
  }

  let resolved = false

  const action = new TestAction()
  action.perform().then(() => {
    resolved = true
  })

  setTimeout(200).then(() => {
    action.cancel()
  })

  await setTimeout(400)

  t.false(resolved)
})
