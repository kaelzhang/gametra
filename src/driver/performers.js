const {setTimeout} = require('node:timers/promises')

const {Pausable} = require('./pausable')

const {
  UNDEFINED,
  NOOP
} = require('../constants')


const LAST_PROCESSED_KEY = Symbol('lastProcessed')
const DEFAULT_LAST_ACCESSOR = {
  get () {
    return this[LAST_PROCESSED_KEY]
  },

  set (value) {
    this[LAST_PROCESSED_KEY] = value
  }
}


const THROTTLE_TYPE = {
  IGNORE: 'ignore',
  QUEUE: 'queue',
  CACHE: 'cache'
}

// A performer that prevents an action from performing too frequently
class ThrottledPerformer extends Pausable {
  #canceled = false
  #throttlePromise
  #throttle
  #mode
  #lastAccessor
  #lastResult

  // It is unnecessary to define the DEFAULT_OPTIONS for
  // the original parent class of ThrottledPerformer

  constructor ({
    throttle = 100,
    throttleMode = THROTTLE_TYPE.QUEUE,
    throttleLastAccessor = DEFAULT_LAST_ACCESSOR
  }) {
    super()

    this.#throttle = throttle
    this.#mode = throttleMode
    this.#lastAccessor = throttleLastAccessor
  }

  cancel () {
    this.#canceled = true
  }

  async #wait (...args) {
    while (this.#throttlePromise) {
      if (this.#mode === THROTTLE_TYPE.IGNORE) {
        // There is already a task is running,
        // so just ignore the current task

        // TODO: more tests
        return true
      }

      // It is an async lock
      await this.#throttlePromise
    }
    // Only if the lock is released or not set, then proceed the real checking

    const {promise, resolve} = Promise.withResolvers()
    this.#throttlePromise = promise

    const ignore = await this.#doWait(...args)

    resolve()
    this.#throttlePromise = UNDEFINED

    return ignore
  }

  async #doWait (...args) {
    const last = await this.#lastAccessor.get.call(this, ...args)

    const wait = last === UNDEFINED
      ? 0
      : this.#throttle - (Date.now() - last)

    if (this.#mode === THROTTLE_TYPE.QUEUE) {
      if (wait > 0) {
        await setTimeout(wait)
      }

      await this.#updateLastProcessed(...args)
      return false
    }

    if (wait > 0) {
      // Just ignore the action
      return true
    }

    // Otherwise, the action should be performed
    await this.#updateLastProcessed(...args)
    return false
  }

  async #updateLastProcessed (...args) {
    return this.#lastAccessor.set.call(this, Date.now(), ...args)
  }

  async perform (perform,...args) {
    this.#canceled = false

    const ignore = await this.#wait(...args)

    if (ignore) {
      if (this.#mode === THROTTLE_TYPE.CACHE) {
        return this.#lastResult
      }

      return
    }

    if (this.#canceled) {
      return
    }

    await this.waitPause()

    const result = await perform(...args)
    this.#lastResult = result
    return result
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
  #resultResolve = NOOP

  cancel () {
    this.#resolve()
  }

  #resolve (result) {
    this.#resultResolve(result)
    this.#resultResolve = NOOP
    this.#resultPromise = UNDEFINED
  }

  async perform (perform, ...args) {
    if (this.#resultPromise) {
      return this.#resultPromise
    }

    this.#resultPromise = perform(...args)

    const {promise, resolve} = Promise.withResolvers()
    this.#resultResolve = resolve

    let result

    try {
      result = await this.#resultPromise
    } catch (error) {
      this.#resolve()
      throw error
    }

    this.#resolve(result)
    return promise
  }
}


module.exports = {
  ThrottledPerformer,
  IntervalPerformer,
  SharedPerformer
}
