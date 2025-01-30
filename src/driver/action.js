const {setTimeout} = require('node:timers/promises')

const {
  UNDEFINED,
  NotImplementedError
} = require('../util')


class IntervalPerformer {
  _canceled = false
  _lastChecked = UNDEFINED

  constructor ({
    checkInterval = 100
  }, perform) {
    this._interval = checkInterval
    this._perform = perform
  }

  cancel () {
    this._canceled = true
  }

  async _wait () {
    if (this._lastChecked === UNDEFINED) {
      return
    }

    const wait = this._interval - (Date.now() - this._lastChecked)
    if (wait > 0) {
      await setTimeout(wait)
    }

    return
  }

  async start (args) {
    return new Promise(async (resolve) => {
      while (true) {
        if (this._canceled) {
          return
        }

        await this._wait()

        const matched = await this._perform(...args)
        this._lastChecked = Date.now()

        if (matched) {
          return resolve(matched)
        }
      }
    })
  }
}


class Action {
  _partial = null
  _performer = null

  _getOptions (options) {
    return {
      ...(this.constructor.DEFAULT_OPTIONS || {}),
      ...options
    }
  }

  _perform () {
    throw new NotImplementedError(
      `${this.constructor.name}#_perform is not implemented`
    )
  }

  cancel () {
    if (typeof this._cancel === 'function') {
      this._cancel()
      return
    }

    if (this._performer) {
      this._performer.cancel()
      this._performer = null
    }
  }

  partial (...args) {
    this._partial = args
    return this
  }

  _getArgs (args) {
    this._checkPartial()

    if (!this._partial) {
      return args
    }

    return [...this._partial, ...args]
  }

  _checkPartial () {
    const {
      REQUIRED_ARGS = 0
    } = this.constructor

    const {length} = this._partial || []
    if (length < REQUIRED_ARGS) {
      throw new RuntimeError(
        `${this.constructor.name}#perform requires ${REQUIRED_ARGS} arguments to be defined in advance by using .partial()`
      )
    }
  }

  // `match` method should always be called once
  //   for that it does not provide internal checking mechanism
  async perform (args = [], options = {}) {
    const argList = this._getArgs(args)

    const Performer = this.constructor.Performer

    if (!Performer) {
      return this._perform(...argList)
    }

    if (this._performer) {
      throw new RuntimeError(
        `${this.constructor.name}#perform is already running in Performer mode`
      )
    }

    const opts = this._getOptions(options)

    this._performer = new Performer(
      opts,
      this._perform.bind(this)
    )

    const result = await this._performer.start(argList)
    this._performer = null

    return result
  }
}


module.exports = {
  Action,
  IntervalPerformer
}
