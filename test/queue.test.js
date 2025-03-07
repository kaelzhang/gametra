const test = require('ava')
const log = require('util').debuglog('gametra')

const {
  Queue
} = require('../src/driver/queue')


test('queue', async t => {
  const queue = new Queue()

  async function willThrow (n) {
    throw new Error(`test ${n}`)
  }

  await t.throwsAsync(() => queue.add(() => willThrow(1)), {
    message: 'test 1'
  })

  await t.throwsAsync(() => queue.add(() => willThrow(2)), {
    message: 'test 2'
  })
})
