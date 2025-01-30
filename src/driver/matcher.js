const {setTimeout} = require('node:timers/promises')

const {ssim} = require('ssim.js')
const {Jimp} = require('jimp')

const {
  encodeNativeBMPImage
} = require('../util')

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
    game,
    viewport,
    // The target image buffer to match, could be either
    // - a string path to the image file
    // - a Jimp instance
    to, {
      checkInterval = 100,
      similarity = 0.9
    } = {}
  ) {
    super(checkInterval)
    this._game = game
    this._viewport = viewport
    this._to = to

    const {
      promise,
      resolve
    } = Promise.withResolvers()

    this._toPromise = promise
    this._toResolve = resolve
    this._toChecked = false

    this._similarity = similarity
  }

  async _checkTo () {
    if (this._toChecked) {
      return this._toPromise
    }

    this._toChecked = true

    let to

    if (typeof this._to === 'string') {
      to = await Jimp.read(this._to)
    } else {
      to = this._to
    }

    this._toResolve(to)
    return to
  }

  async _check () {
    const [rawViewport, to] = await Promise.all([
      this._game.screenshot(this._viewport),
      this._checkTo()
    ])

    const viewport = encodeNativeBMPImage(rawViewport)

    // Compare the similarity between `viewport` and `this._to`,
    const similarity = this._compare(viewport.bitmap, this._to.bitmap)

    console.log(similarity, 'similarity')

    return similarity >= this._similarity
  }

  _compare (from, to) {
    const {mssim} = ssim(from, to)
    return mssim
  }
}

module.exports = {
  ImageMatcher
}
