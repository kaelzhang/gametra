const {
  log,
  Pausable
} = require('../util')

const {
  NOOP
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

  perform (args) {
    this.#args = args
  }

  add (action) {
    this.#processing.add(action)

    action.perform(...this.#args).then(
      () => {
        this.#processing.delete(action)
      },
      error => {

      }
    )
  }

  async complete () {

  }
}


module.exports = {
  Queue,
  Cargo
}
