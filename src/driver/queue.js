const {
  log,
  Pausable
} = require('../util')

const {
  NOOP,
  EVENT_ERROR,
  EVENT_DRAINED
} = require('../const')


class Queue {
  #chain = Promise.resolve()

  // Create an async queue, that
  add (factory) {
    const result = this.#chain.then(factory)

    this.#chain = result
    // So that the chain is not broken by an error
    .catch(NOOP)

    return result
  }
}


class Cargo extends Pausable {
  #count = 0
  #processing = new Set()
  #args = []

  args (args) {
    this.#args = args
  }

  add (action) {
    this.#processing.add(action)

    const promise = action.perform(...this.#args)

    promise.then(
      result => {
        this.#processing.delete(action)
        this.#check()
      },
      error => {
        this.emit(EVENT_ERROR, error)
      }
    )

    return promise
  }

  #check () {
    if (this.#processing.size === 0) {
      this.emit(EVENT_DRAINED)
    }
  }
}


module.exports = {
  Queue,
  Cargo
}
