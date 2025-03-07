const test = require('ava')
const log = require('util').debuglog('gametra')

const {setTimeout} = require('node:timers/promises')

const {
  Action,
  Scheduler
} = require('..')


test('add outside of an event handler', t => {
  const scheduler = new Scheduler()

  t.throws(() => {
    scheduler.add(new Action())
  }, {
    message: /outside/
  })
})


test('start master scheduler twice', async t => {
  const scheduler = new Scheduler()

  await t.throwsAsync(async () => Promise.all([
    scheduler.start(),
    scheduler.start()
  ]), {
    message: /more than once/
  })
})


test('scheduler fork condition error', async t => {
  class MyForkAction extends Action {
    async _perform (game) {
      await Promise.all(
        [1].map(n => this.#error(n))
      )
    }

    #error (n) {
      throw new Error(`test ${n}`)
    }
  }

  const forkAction = new MyForkAction()

  class MyAction extends Action {
    async _perform (game) {
      await setTimeout(100)
    }
  }

  const action = new MyAction()

  let forkError

  const scheduler = new Scheduler()
  .on('idle', add => {
    add(action)
  })
  .on('error', ({error}) => {
    forkError = error
  })

  scheduler.fork(forkAction)

  scheduler.start()

  await setTimeout(200)

  t.is(forkError.message, 'test 1')

  scheduler.pause()
})

