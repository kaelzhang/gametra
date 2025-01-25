const delay = require('delay')
const ssim = require('ssim')

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
      await delay(wait)
    }

    return
  }

  match () {
    return new Promise((resolve) => {
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


class ViewportDescripter {
  constructor(page, x, y, w, h) {
    this._page = page
    this._x = x
    this._y = y
    this._w = w
    this._h = h
  }

  async get () {
    // Fetch the certain viewport from page.screenshot
    //   and return the buffer
    return this._page.screenshot({
      type: 'png',
      clip: {
        x: this._x,
        y: this._y,
        width: this._w,
        height: this._h
      }
    })
  }
}


class ImageMatcher extends IntervalMatcher {
  constructor (
    descripter,
    // The target image buffer to match
    to, {
      checkInterval = 100,
      similarity = 0.9
    } = {}
  ) {
    super(checkInterval)
    this._descripter = descripter
    this._to = to
    this._similarity = similarity
  }

  async _check () {
    const viewport = await this._descripter.get()

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
  ImageMatcher,
  ViewportDescripter
}
