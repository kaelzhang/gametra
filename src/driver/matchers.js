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
  #viewport
  #to
  #toPromise

  constructor (
    viewport,
    // The target image buffer to match, could be either
    // - a string path to the image file
    // - string paths to the image files
    to
  ) {
    super()
    this.#viewport = viewport
    this.#to = [].concat(to)
  }

  async #targetImages () {
    if (this.#toPromise) {
      return this.#toPromise
    }

    const {promise, resolve} = Promise.withResolvers()

    this.#toPromise = promise

    const images = await Promise.all(this.#to.map(to => Jimp.read(to)))
    resolve(images)

    return images
  }

  async _perform (game) {
    const [viewport, images] = await Promise.all([
      game.screenshot(this.#viewport),
      this.#targetImages()
    ])

    const similarities = await Promise.all(
      images.map(image => this.#compare(viewport.bitmap, image.bitmap))
    )

    log('image matcher similarities', similarities)

    return similarities
  }

  #compare (from, to) {
    const {mssim} = ssim(from, to)
    return mssim
  }
}

module.exports = {
  ImageMatcher
}
