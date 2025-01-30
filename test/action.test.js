const test = require('ava')
const log = require('util').debuglog('gametra')

const {setTimeout} = require('node:timers/promises')

const {
  Action,
  IntervalPerformer
} = require('../src/driver/action')


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
