const {setTimeout} = require('node:timers/promises')

const {
  Pausable,
  UNDEFINED
} = require('../util')


// A performer that prevents an action from performing too frequently
class ThrottledPerformer extends Pausable {
  #canceled = false
  #lastProcessed
  #throttlePromise
  #throttle
  #perform

  static DEFAULT_OPTIONS = {
    throttle: 100
  }

  constructor ({
    throttle
  }, perform) {
    super()

    this.#throttle = throttle
    this.#perform = perform
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

  async perform (...args) {
    this.#canceled = false

    await this.#wait()

    if (this.#canceled) {
      return
    }

    await this.waitPause()

    return this.#perform(...args)
  }
}


// A performer that perform an action regularly
class IntervalPerformer extends Pausable {
  #canceled = false
  #lastChecked
  #interval
  #perform
  #running = false

  static DEFAULT_OPTIONS = {
    interval: 100
  }

  constructor ({
    interval
  }, perform) {
    super()

    this.#interval = interval
    this.#perform = perform
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

  async perform (...args) {
    if (this.#running) {
      // IntervalPerformer is not allowed to be started twice
      throw new Error(
        `${this.constructor.name} is already running`
      )
    }

    this.#running = true
    const result = await this.#start(...args)
    this.#running = false
    return result
  }

  async #start (...args) {
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

      const matched = await this.#perform(...args)
      this.#lastChecked = Date.now()

      if (matched) {
        return matched
      }
    }
  }
}


class SharedPerformer extends Pausable {
  #perform
  #resultPromise

  constructor (_, perform) {
    super()
    this.#perform = perform
  }

  async perform (...args) {
    if (this.#resultPromise) {
      // Whatever the args are, just return the same result
      return this.#resultPromise
    }

    const {promise, resolve} = Promise.withResolvers()
    this.#resultPromise = promise

    const result = await this.#perform(...args)

    resolve(result)
    this.#resultPromise = UNDEFINED

    return result
  }
}


module.exports = {
  ThrottledPerformer,
  IntervalPerformer
}
