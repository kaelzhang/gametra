const test = require('ava')
const log = require('util').debuglog('gametra')

const {setTimeout} = require('node:timers/promises')

const {
  Action,
  ThrottledPerformer
} = require('../src/driver/action')


// test('normal action performing', async t => {
//   class TestAction extends Action {
//     static Performer = ThrottledPerformer

//     async _perform () {
//       return 1
//     }
//   }

//   const action = new TestAction()
//   const result = await action.perform()

//   t.is(result, 1)
// })


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

  performTimes.reduce((prev, current) => {
    if (current - prev < 100) {
      passed = false
    }
  })

  t.true(passed)
})
