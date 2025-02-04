const test = require('ava')
const log = require('util').debuglog('gametra')

const {setTimeout} = require('node:timers/promises')

const {
  ThrottledPerformer,
  SharedPerformer,
  Action
} = require('..')


test('performers execution order', async t => {
  let count = 0

  class TestAction extends Action {
    static Performer = [SharedPerformer, ThrottledPerformer]

    async _perform () {
      return count ++
    }
  }

  const action = new TestAction()

  await Promise.all([
    action.perform(),
    action.perform(),
    action.perform()
  ])

  t.is(count, 1)
})

