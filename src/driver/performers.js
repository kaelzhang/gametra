const {setTimeout} = require('node:timers/promises')

const {
  Pausable
} = require('../util')

const {
  UNDEFINED,
  NOOP
} = require('../const')


// A performer that prevents an action from performing too frequently
class ThrottledPerformer extends Pausable {
  #canceled = false
  #lastProcessed
  #throttlePromise
  #throttle

  static DEFAULT_OPTIONS = {
    throttle: 100
  }

  constructor ({
    throttle
  }) {
    super()

    this.#throttle = throttle
  }

  cancel () {
    this.#canceled = true
  }

  async #wait () {
    if (this.#throttlePromise) {
      // It is an async lock
      await this.#throttlePromise
    }
    // Only if the lock is released or not set, then proceed the real checking

    const wait = this.#lastProcessed === UNDEFINED
      ? 0
      : this.#throttle - (Date.now() - this.#lastProcessed)

    if (wait > 0) {
      const {promise, resolve} = Promise.withResolvers()
      this.#throttlePromise = promise

      await setTimeout(wait)

      // We should update the last processed time before releasing the lock
      this.#lastProcessed = Date.now()

      resolve()
      this.#throttlePromise = UNDEFINED
      return
    }

    this.#lastProcessed = Date.now()
  }

  async perform (perform,...args) {
    this.#canceled = false

    await this.#wait()

    if (this.#canceled) {
      return
    }

    await this.waitPause()

    return perform(...args)
  }
}


// A performer that perform an action regularly,
// until the action returns a truthy value
class IntervalPerformer extends Pausable {
  #canceled = false
  #lastChecked
  #interval
  #running = false

  static DEFAULT_OPTIONS = {
    interval: 100
  }

  constructor ({
    interval
  }) {
    super()

    this.#interval = interval
  }

  cancel () {
    this.#canceled = true
  }

  async #wait () {
    if (this.#lastChecked === UNDEFINED) {
      return
    }

    const wait = this.#interval - (Date.now() - this.#lastChecked)
    if (wait > 0) {
      await setTimeout(wait)
    }

    return
  }

  async perform (perform, ...args) {
    if (this.#running) {
      // IntervalPerformer is not allowed to be started twice
      throw new Error(
        `${this.constructor.name} is already running`
      )
    }

    this.#running = true
    const result = await this.#start(perform, ...args)
    this.#running = false
    return result
  }

  async #start (perform, ...args) {
    this.#canceled = false

    while (true) {
      if (this.#canceled) {
        return
      }

      await this.#wait()

      // Check again if the action is canceled
      // because the action may be canceled in the wait phase
      if (this.#canceled) {
        return
      }

      await this.waitPause()

      const matched = await perform(...args)
      this.#lastChecked = Date.now()

      if (matched) {
        return matched
      }
    }
  }
}


class SharedPerformer extends Pausable {
  #resultPromise
  #resultResolve

  constructor () {
    super()
  }

  #resolve (result) {
    this.#resultResolve(result)
    this.#resultResolve = NOOP
    this.#resultPromise = UNDEFINED
  }

  cancel () {
    this.#resolve()
  }

  async perform (perform, ...args) {
    if (!this.#resultPromise) {
      this.#perform(perform, ...args)
    }

    return this.#resultPromise
  }

  #perform (perform, ...args) {
    const {promise, resolve} = Promise.withResolvers()
    this.#resultPromise = promise
    this.#resultResolve = resolve

    perform(...args).then(result => {
      this.#resolve(result)
    })
  }
}


module.exports = {
  ThrottledPerformer,
  IntervalPerformer,
  SharedPerformer
}
