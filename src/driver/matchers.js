const {Jimp} = require('jimp')
const {ssim} = require('ssim.js')

const {
  Action,
  IntervalPerformer
} = require('./action')

const {
  log
} = require('../util')

class ImageMatcher extends Action {
  static Performer = IntervalPerformer

  #viewport
  #to
  #toPromise
  #toResolve
  #toChecked = false
  #similarity

  constructor (
    viewport,
    // The target image buffer to match, could be either
    // - a string path to the image file
    // - a Jimp instance
    to, {
      similarity = 0.9
    } = {}
  ) {
    super()
    this.#viewport = viewport
    this.#to = to

    const {
      promise,
      resolve
    } = Promise.withResolvers()

    this.#toPromise = promise
    this.#toResolve = resolve
    this.#similarity = similarity
  }

  async #checkTo () {
    if (this.#toChecked) {
      return this.#toPromise
    }

    this.#toChecked = true

    let to

    if (typeof this.#to === 'string') {
      to = await Jimp.read(this.#to)
    } else {
      to = this.#to
    }

    this.#toResolve(to)
    return to
  }

  async _perform (game) {
    const [viewport, to] = await Promise.all([
      game.screenshot(this.#viewport),
      this.#checkTo()
    ])

    // Compare the similarity between `viewport` and `this.#to`,
    const similarity = this.#compare(viewport.bitmap, to.bitmap)

    log('similarity', this.#viewport.object(), similarity)

    return similarity >= this.#similarity
  }

  #compare (from, to) {
    const {mssim} = ssim(from, to)
    return mssim
  }
}

module.exports = {
  ImageMatcher
}
