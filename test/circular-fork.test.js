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

  const {
    promise: masterPromise,
    resolve: masterResolve
  } = Promise.withResolvers()

  const {
    promise: masterActionPromise,
    resolve: masterActionResolve
  } = Promise.withResolvers()

  const {
    promise: subActionPromise,
    resolve: subActionResolve
  } = Promise.withResolvers()

  const masterIdleAction = createAction(async function () {
    await setTimeout(40)

    if (this.paused) {
      return
    }

    if (masterIdleCount >= 4) {
      masterResolve()
      return
    }

    masterIdleCount ++
    actions.push(2)

    if (masterIdleCount === 2) {
      masterActionResolve()
    }
  })
  .queue(true)

  const subAction = createAction(async () => {
    await setTimeout(10)
    actions.push(3)
  })
  .queue(true)

  let subIdleCount = 0

  const subIdleAction = createAction(async function () {
    await setTimeout(40)

    if (this.paused) {
      return
    }

    subIdleCount ++
    actions.push(4)

    if (subIdleCount === 2) {
      subActionResolve()
    }
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
    await masterActionPromise

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
  .exit(async () => {
    return false
  })

  // Dead fork
  sub.fork(async () => {
    return false
  }, sub)

  const sub2Action = createAction(async () => {
    await setTimeout(100)
  })

  const sub2 = sub.fork(async () => {
    await subActionPromise
    return true
  })
  .name('sub2')
  .on('idle', add => {
    add(sub2Action)
  })
  .exit(async () => {
    // Never exit
    return false
  })

  sub2.fork(async () => {
    return true
  }, master)

  master.start()

  await masterPromise
  master.pause()

  t.deepEqual(actions, [1, 2, 2, 3, 4, 4, 1, 2, 2])
})
