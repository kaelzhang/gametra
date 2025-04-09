const test = require('ava')
const {inspect} = require('node:util')

const {setTimeout} = require('node:timers/promises')

const {
  Action,
  createAction,
  Scheduler,
  IntervalPerformer
} = require('..')


test('fork into itself', async t => {
  let shouldFork = false

  const fork = () => {
    shouldFork = true
  }

  const condition = async () => {
    await setTimeout(10)
    if (shouldFork) {
      shouldFork = false
      return true
    }
  }


  let count = 0

  class TestAction extends Action {
    async _perform () {
      await setTimeout(50)
      count ++
    }
  }

  const action = new TestAction()

  const scheduler = new Scheduler({
    master: false
  })
  .on('start', add => {
    add(action)
  })

  scheduler.fork(condition, scheduler)

  fork()

  scheduler.start()

  await setTimeout(200)

  t.is(count, 2)
})


test('fork into master', async t => {
  const actions = []

  const masterAction = createAction(async () => {
    await setTimeout(10)
    actions.push(1)
  })
  .queue(true)

  let masterIdleCount = 0

  const {promise, resolve} = Promise.withResolvers()

  const masterIdleAction = createAction(async function () {
    await setTimeout(40)

    if (this.paused) {
      return
    }

    if (masterIdleCount >= 4) {
      resolve()
      return
    }

    masterIdleCount ++
    actions.push(2)
  })
  .queue(true)

  const subAction = createAction(async () => {
    await setTimeout(10)
    actions.push(3)
  })
  .queue(true)

  const subIdleAction = createAction(async function () {
    await setTimeout(40)

    if (this.paused) {
      return
    }

    actions.push(4)
  })
  .queue(true)

  const master = new Scheduler()
  .name('master')
  .on('start', add => {
    add(masterAction)
  })
  .on('idle', add => {
    add(masterIdleAction)
  })

  let masterForked = false

  const sub = master.fork(async () => {
    await setTimeout(100)

    if (masterForked) {
      return
    }

    masterForked = true

    return true
  })
  .name('sub')
  .on('start', add => {
    add(subAction)
  })
  .on('idle', add => {
    add(subIdleAction)
  })

  sub.fork(async () => {
    await setTimeout(100)
    return true
  }, master)

  sub.exit(async () => {
    await setTimeout(100)
    // Never exit
    return false
  })

  master.start()

  await promise
  master.pause()

  t.deepEqual(actions, [1, 2, 2, 3, 4, 4, 1, 2, 2])
})
