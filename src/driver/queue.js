const {
  log
} = require('../util')


class Queue {
  #chain = Promise.resolve()

  // Create an async queue, that
  add (factory) {
    const result = this.#chain.then(factory)

    this.#chain = result
    // So that the chain is not broken by an error
    .catch(err => {
      // TODO:
      // Log the error to an error log file
      log('Error in queue', err)
    })

    return result
  }
}

module.exports = {
  Queue
}
