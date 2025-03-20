const {
  UNDEFINED,
  EVENT_ERROR,
  EVENT_PAUSED
} = require('../constants')


class Pausable {
  #pausePromise
  #pauseResolve
  #listeners = {}

  #getListeners (event) {
    const listeners = this.#listeners[event]

    if (listeners) {
      return listeners
    }

    return this.#listeners[event] = []
  }

  on (event, fn) {
    this.#getListeners(event).push(fn)
    return this
  }

  off (event, fn) {
    this.#getListeners(event).splice(this.#getListeners(event).indexOf(fn), 1)
    return this
  }

  removeAllListeners (event) {
    if (event === UNDEFINED) {
      this.#listeners = {}
    } else {
      this.#getListeners(event).length = 0
    }

    return this
  }

  async emit (event, ...args) {
    await this.waitPause()

    const listeners = this.#getListeners(event)

    await Promise.all(
      listeners.map(async fn => {
        try {
          await fn(...args)
        } catch (error) {
          this.emit(EVENT_ERROR, {
            error,
            host: this
          })
        }
      })
    )

    return !!listeners.length
  }

  get paused () {
    return !!this.#pausePromise
  }

  pause () {
    if (this.paused) {
      // Already paused. Skip.
      // We should never pause again,
      // or the promise created previously will never be resolved
      return
    }

    const {promise, resolve} = Promise.withResolvers()

    // We should emit the event before assigning this.#pausePromise
    this.emit(EVENT_PAUSED)

    this.#pausePromise = promise
    this.#pauseResolve = resolve
  }

  resume () {
    if (!this.paused) {
      // Already resumed. Skip.
      return
    }

    this.#pauseResolve()

    this.#pausePromise = UNDEFINED
    this.#pauseResolve = UNDEFINED
  }

  // Could be used in the _perform method of a sub class
  async waitPause () {
    if (this.#pausePromise) {
      return this.#pausePromise
    }
  }
}


module.exports = {
  Pausable
}
