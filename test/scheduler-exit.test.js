const test = require('ava')
const log = require('util').debuglog('gametra')

const {setTimeout} = require('node:timers/promises')

const {
  Action,
  Scheduler,
  IntervalPerformer,
  createAction
} = require('..')


test('scheduler exit', async t => {
  const exitAction = createAction(async () => {
    await setTimeout(499)
    return true
  }).queue(false)

  let count = 0

  const shortAction = createAction(async () => {
    await setTimeout(100)
    count ++
  })

  const start = Date.now()

  const scheduler = new Scheduler({
    master: false
  })
  .on('idle', add => {
    add(shortAction)
  })

  scheduler.start()
  scheduler.resume()

  await scheduler.complete()
  t.is(count, 1)

  scheduler.resume()
  scheduler.exit(exitAction)

  scheduler.start()

  await scheduler.complete()
  t.is(count, 6)
})
