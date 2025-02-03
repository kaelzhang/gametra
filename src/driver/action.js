const {setTimeout} = require('node:timers/promises')
const EventEmitter = require('node:events')

const {
  UNDEFINED,
  NotImplementedError
} = require('../util')


class Pausable extends EventEmitter {
  #pausePromise
  #pauseResolve

  get paused () {
    return !!this.#pausePromise
  }

  pause () {
    const {promise, resolve} = Promise.withResolvers()

    this.#pausePromise = promise
    this.#pauseResolve = resolve
  }

  resume () {
    if (this.#pauseResolve) {
      this.#pauseResolve()
    }

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

  async start (...args) {
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

  async start (...args) {
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


class Action extends Pausable {
  #partial = null
  #performer = null
  #cancel
  #canceled = false

  #getPerformer () {
    if (this.#performer) {
      // We should always create one and only one performer for an action
      return this.#performer
    }

    const Performer = this.constructor.Performer
    if (!Performer) {
      return
    }

    const options = {
      ...(this.constructor.performerOptions || {}),
      ...(Performer.DEFAULT_OPTIONS || {})
    }

    this.#performer = new Performer(options, this._perform.bind(this))
    return this.#performer
  }

  _perform () {
    throw new NotImplementedError(
      `${this.constructor.name}.prototype._perform is not implemented`
    )
  }

  async cancel () {
    if (this.#performer) {
      this.#performer.cancel()
      this.#performer = null
    }

    if (typeof this._cancel === 'function') {
      return this._cancel()
    }
  }

  pause () {
    if (this.#performer) {
      this.#performer.pause()
    }

    super.pause()
  }

  resume () {
    if (this.#performer) {
      this.#performer.resume()
    }

    super.resume()
  }

  partial (...args) {
    this.#partial = args
    return this
  }

  #getArgs (args) {
    this.#checkPartial()

    if (!this.#partial) {
      return args
    }

    return [...this.#partial, ...args]
  }

  #checkPartial () {
    const {
      REQUIRED_ARGS = 0
    } = this.constructor

    const {length} = this.#partial || []
    if (length < REQUIRED_ARGS) {
      throw new Error(
        `${this.constructor.name}.prototype._perform requires ${REQUIRED_ARGS} arguments to be defined in advance by using .partial()`
      )
    }
  }

  async perform (...args) {
    this.#canceled = false
    const argList = this.#getArgs(args)

    const performer = this.#getPerformer()

    if (!performer) {
      return this._perform(...argList)
    }

    return this.#performer.start(...argList)
  }
}


module.exports = {
  Pausable,
  Action,
  ThrottledPerformer,
  IntervalPerformer
}
