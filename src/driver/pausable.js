const {inspect} = require('node:util')

const {
  UNDEFINED,
  EVENT_ERROR,
  DO_EMIT,
  DO_EMIT_ASYNC
} = require('../constants')


class Pausable {
  #pausePromise
  #pauseResolve
  #listeners = {}
  #emitsOnHold = []
  #name

  name (name) {
    this.#name = name
    return this
  }

  [inspect.custom] () {
    const name = this.#name || 'no-name'
    return `[${this.constructor.name}: ${name}]`
  }

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

  // ```
  // this.emit('error', {error})
  // ```
  [DO_EMIT] (event, ...args) {
    if (event === EVENT_ERROR) {
      // Emit error immediately without `await waitPause()`
      return this.#emitError(...args)
    }

    if (this.paused) {
      this.#emitsOnHold.push([event, ...args])
      return false
    }

    return this.#emitSync(event, ...args)
  }

  #emitError (errorInfo) {
    const listeners = this.#getListeners(EVENT_ERROR)

    // Try not to override the host as mush as possible
    const host = errorInfo.host || this
    const arg = {
      ...errorInfo,
      host
    }

    return this.#emitSync(EVENT_ERROR, arg)
  }

  #emitSync (event, ...args) {
    const listeners = this.#getListeners(event)
    listeners.forEach(fn => {
      fn(...args)
    })

    return !!listeners.length
  }

  async [DO_EMIT_ASYNC] (event, ...args) {
    await this.waitPause()

    const listeners = this.#getListeners(event)

    await Promise.all(
      listeners.map(async fn => {
        try {
          await fn(...args)
        } catch (error) {
          this[DO_EMIT](EVENT_ERROR, {
            error
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

    this.#pausePromise = promise
    this.#pauseResolve = resolve
  }

  resume () {
    if (!this.paused) {
      // Already resumed. Skip.
      return
    }

    const onHold = [].concat(this.#emitsOnHold)
    this.#emitsOnHold.length = 0

    for (const args of onHold) {
      this.#emitSync(...args)
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
