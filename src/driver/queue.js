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


module.exports = {
  Queue
}
