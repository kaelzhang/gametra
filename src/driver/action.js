const {setTimeout} = require('node:timers/promises')

const {
  UNDEFINED,
  NotImplementedError,
  Pausable
} = require('../util')


class Action extends Pausable {
  #partial = null
  #performer = null
  #performerOptions
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
      // Performer class options
      ...(Performer.DEFAULT_OPTIONS || {}),
      // Class options
      ...(this.constructor.performerOptions || {}),
      // Instance options
      ...(this.#performerOptions || {})
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

  options (options) {
    this.#performerOptions = options
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

    return this.#performer.perform(...argList)
  }
}


module.exports = {
  Action
}
