const {setTimeout} = require('node:timers/promises')

const {
  Pausable
} = require('../util')

const {
  UNDEFINED,
  NOOP
} = require('../const')


const LAST_PROCESSED_KEY = Symbol('lastProcessed')
const DEFAULT_LAST_ACCESSOR = {
  get () {
    return this[LAST_PROCESSED_KEY]
  },

  set (value) {
    this[LAST_PROCESSED_KEY] = value
  }
}

// A performer that prevents an action from performing too frequently
class ThrottledPerformer extends Pausable {
  #canceled = false
  #throttlePromise
  #throttle
  #lastAccessor

  // It is unnecessary to define the DEFAULT_OPTIONS for
  // the original parent class of ThrottledPerformer

  constructor ({
    throttle = 100,
    lastAccessor = DEFAULT_LAST_ACCESSOR
  }) {
    super()

    this.#throttle = throttle
    this.#lastAccessor = lastAccessor
  }

  cancel () {
    this.#canceled = true
  }

  async #wait (...args) {
    while (this.#throttlePromise) {
      // It is an async lock
      await this.#throttlePromise
    }
    // Only if the lock is released or not set, then proceed the real checking

    const {promise, resolve} = Promise.withResolvers()
    this.#throttlePromise = promise

    //////////////////////////////////////////////////////////////////////////

    const last = await this.#lastAccessor.get.call(this, ...args)

    const wait = last === UNDEFINED
      ? 0
      : this.#throttle - (Date.now() - last)

    if (wait > 0) {
      await setTimeout(wait)
    }

    await this.#updateLastProcessed(...args)

    //////////////////////////////////////////////////////////////////////////

    resolve()
    this.#throttlePromise = UNDEFINED
  }

  async #updateLastProcessed (...args) {
    return this.#lastAccessor.set.call(this, Date.now(), ...args)
  }

  async perform (perform,...args) {
    this.#canceled = false

    await this.#wait(...args)

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

  constructor ({
    interval = 100
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
