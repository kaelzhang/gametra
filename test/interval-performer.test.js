const test = require('ava')
const log = require('util').debuglog('gametra')

const {setTimeout} = require('node:timers/promises')

const {
  Action,
  IntervalPerformer
} = require('..')


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

test('test action IntervalPerformer#cancel: will not resolved as true', async t => {
  const start = Date.now()

  class TestAction extends Action {
    static Performer = IntervalPerformer

    async _perform () {
      return Date.now() - start > 300
    }
  }

  let resolved = false

  const action = new TestAction()
  action.perform().then(result => {
    resolved = result
  })

  setTimeout(200).then(() => {
    action.cancel()
  })

  await setTimeout(400)

  t.is(resolved, undefined)
})


test('action cancel in before waitphase', async t => {
  const start = Date.now()

  class TestAction extends Action {
    static Performer = IntervalPerformer

    async _perform () {
      await setTimeout(200)
      return Date.now() - start > 300
    }
  }


  let resolved = false

  const action = new TestAction()
  action.perform().then(result => {
    resolved = result
  })
  await setTimeout(1)
  action.cancel()
  await setTimeout(400)

  t.is(resolved, undefined)
})
