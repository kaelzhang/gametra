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
