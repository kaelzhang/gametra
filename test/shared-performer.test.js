const test = require('ava')
const log = require('util').debuglog('gametra')

const {setTimeout} = require('node:timers/promises')

const {
  ThrottledPerformer,
  SharedPerformer,
  Action,
  shared
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


test('same behavior by using shared', async t => {
  let count = 0

  const sharedFn = shared(() => count ++)

  await Promise.all([
    sharedFn(),
    sharedFn(),
    sharedFn()
  ])

  t.is(count, 1)
})
