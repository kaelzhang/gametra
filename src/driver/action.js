const {setTimeout} = require('node:timers/promises')

const {
  UNDEFINED,
  NotImplementedError
} = require('../util')


class ThrottledPerformer {
  #canceled = false
  #lastChecked
  #throttle
  #perform

  constructor ({
    throttle = 100
  }, perform) {
    this.#throttle = throttle
    this.#perform = perform
  }

  cancel () {
    this.#canceled = true
  }

  async #wait () {
    if (this.#lastChecked === UNDEFINED) {
      return
    }

    const wait = this.#throttle - (Date.now() - this.#lastChecked)
    if (wait > 0) {
      await setTimeout(wait)
    }

    return
  }

  async start (args) {
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

      const matched = await this.#perform(...args)
      this.#lastChecked = Date.now()

      if (matched) {
        return matched
      }
    }
  }
}


class Action {
  #partial = null
  #performer = null
  #cancel

  #getOptions (options) {
    return {
      ...(this.constructor.DEFAULT_OPTIONS || {}),
      ...options
    }
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

  async perform (args = [], options = {}) {
    const argList = this.#getArgs(args)

    const Performer = this.constructor.Performer

    if (!Performer) {
      return this._perform(...argList)
    }

    if (this.#performer) {
      throw new Error(
        `${this.constructor.name}#perform is already running in Performer mode`
      )
    }

    const opts = this.#getOptions(options)

    this.#performer = new Performer(
      opts,
      this._perform.bind(this)
    )

    const result = await this.#performer.start(argList)
    this.#performer = null

    return result
  }
}


module.exports = {
  Action,
  ThrottledPerformer
}
