const {
  setImmediate
} = require('node:timers/promises')

const {
  Pausable
} = require('../util')

const {
  NOOP,
  EVENT_ERROR,
  EVENT_DRAINING,
  EVENT_DRAINED,
  EVENT_RESET
} = require('../const')



class Cargo extends Pausable {
  #count = 0
  #processing = new Set()
  #args = []
  #onError = NOOP

  constructor () {
    super()

    this.pause()
  }

  args (args) {
    this.#args = args
    return this
  }

  onError (onError) {
    this.#onError = onError
    return this
  }

  get drained () {
    return this.#processing.size === 0
  }

  pause () {
    if (this.paused) {
      return
    }

    this.#apply('pause')

    super.pause()
  }

  resume () {
    if (!this.paused) {
      return
    }

    this.#apply('resume')

    super.resume()
  }

  // Reset the cargo to the initial state
  reset () {
    this.#apply('cancel')
    this.#processing.clear()
    this.emit(EVENT_RESET)
    this.removeAllListeners()

    this.pause()
  }

  #apply (method) {
    for (const action of this.#processing) {
      action[method]()
    }
  }

  add (...actions) {
    for (const action of actions) {
      this.#add(action)
    }
  }


  #add (action) {
    if (this.paused) {
      action.pause()
    }

    this.#processing.add(action)

    const promise = action.perform(...this.#args)

    promise.then(
      result => {
        this.#processing.delete(action)
        console.log('cargo before check', action)
        this.#check()
      },
      this.#onError
    )

    return promise
  }

  #check () {
    console.log('cargo check', this.drained, this.paused)
    if (!this.drained) {
      return
    }

    this.emit(EVENT_DRAINED)
  }
}


module.exports = {
  Cargo
}
