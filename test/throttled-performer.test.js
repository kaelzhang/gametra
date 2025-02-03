const test = require('ava')
const log = require('util').debuglog('gametra')

const {setTimeout} = require('node:timers/promises')

const {
  Action,
  IntervalPerformer,
  ThrottledPerformer
} = require('../src/driver/action')


test('throttled performer', async t => {
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
