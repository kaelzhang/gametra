const {
  setImmediate
} = require('node:timers/promises')

const {Pausable} = require('./pausable')

const {
  NOOP,
  EVENT_ERROR,
  EVENT_DRAINED,

  DO_EMIT,
  KEY_REMOVE_ALL_LISTENERS
} = require('../constants')


class Cargo extends Pausable {
  #count = 0
  #processing = new Set()
  #args = []
  #onError = NOOP

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

  // Cancel and remove all actions
  clean () {
    this.#apply('cancel')
    this.#processing.clear()
  }

  // Reset the cargo to the initial state
  reset () {
    this.clean()
    this[KEY_REMOVE_ALL_LISTENERS]()
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
    } else if (action.paused) {
      action.resume()
    }

    this.#processing.add(action)

    return action
    .perform(...this.#args)
    .catch(error => {
      this.#onError({
        type: 'action-error',
        error,
        action
      })
    })
    .then(result => {
      this.#processing.delete(action)
      this.check()
      return result
    })
  }

  check () {
    if (!this.drained) {
      return
    }

    this[DO_EMIT](EVENT_DRAINED)
  }
}


module.exports = {
  Cargo
}
