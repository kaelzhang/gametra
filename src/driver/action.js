const {setTimeout} = require('node:timers/promises')

const {
  UNDEFINED,
  NotImplementedError
} = require('../util')


class IntervalPerformer {
  constructor (interval, matcher) {
    this._interval = interval
    this._lastChecked = UNDEFINED
    this._canceled = false
  }

  cancel () {
    this._canceled = true
  }

  async _waitNextIntervalMatch () {
    if (this._lastChecked === UNDEFINED) {
      return
    }

    const wait = this._interval - (Date.now() - this._lastChecked)
    if (wait > 0) {
      await setTimeout(wait)
    }

    return
  }

  async _performIntervalMatch () {
    return new Promise(async (resolve) => {
      while (true) {
        if (this._canceled) {
          return
        }

        await this._wait()

        const matched = await this._check()
        this._lastChecked = Date.now()

        if (matched) {
          return resolve(matched)
        }
      }
    })
  }
}


class Action {
  _getOptions (options = {}) {
    return {
      ...(this.constructor.DEFAULT_OPTIONS || {}),
      ...options
    }
  }

  _match () {
    throw new NotImplementedError(
      `${this.constructor.name}#_match is not implemented`
    )
  }

  // `match` method should always be called once
  //   for that it does not provide internal checking mechanism
  async match (args, options) {
    const opts = this._getOptions(options)
    const {interval} = opts

    if (!interval) {
      return this._match(args, opts)
    }
  }
}




module.exports = {
  ImageMatcher
}
