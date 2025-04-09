const test = require('ava')

const {setTimeout} = require('node:timers/promises')

const {
  EventSynthesizer
} = require('../src/driver/synthesizer')


class TestDelegate {
  #x
  #y
  #records

  constructor () {
    this.#x = 0
    this.#y = 0
    this.#records = []
  }

  get x () {
    return this.#x
  }

  get y () {
    return this.#y
  }

  get records () {
    return [].concat(this.#records)
  }

  async mouseMove (x, y) {
    this.#x = x
    this.#y = y
    this.#records.push({type: 'mouseMove', x, y})
  }

  async mouseDown () {
    this.#records.push({type: 'mouseDown'})
  }

  async mouseUp () {
    this.#records.push({type: 'mouseUp'})
  }
}


test('synthesizer#mouseMove', async t => {
  const delegate = new TestDelegate()
  const synthesizer = new EventSynthesizer(delegate)

  await synthesizer.mouseMove(100, 100)

  const event = delegate.records.pop()
  t.is(event.type, 'mouseMove')
  t.is(event.x, 100)
  t.is(event.y, 100)
})
