const {setTimeout} = require('node:timers/promises')
const ssim = require('ssim.js')

const UNDEFINED = void 0


class Matcher {
  // `match` method should always be called once
  //   for that it does not provide internal checking mechanism
  async match () {
  }
}


class IntervalMatcher extends Matcher {
  constructor (interval) {
    super()
    this._interval = interval
    this._lastChecked = UNDEFINED
    this._canceled = false
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

  match () {
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


class ImageMatcher extends IntervalMatcher {
  constructor (
    delegate,
    viewport,
    // The target image buffer to match
    to, {
      checkInterval = 100,
      similarity = 0.9
    } = {}
  ) {
    super(checkInterval)
    this._delegate = delegate
    this._viewport = viewport
    this._to = to
    this._similarity = similarity
  }

  async _check () {
    const viewport = await this._delegate.screenshot(this._viewport)

    // Compare the similarity between `viewport` and `this._to`,
    const similarity = this._compare(viewport, this._to)
    return similarity >= this._similarity
  }

  _compare (viewport, to) {
    const {mssim} = ssim(viewport, to)
    return mssim
  }
}

module.exports = {
  ImageMatcher
}
