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
  #similarity

  constructor (
    viewport,
    // The target image buffer to match, could be either
    // - a string path to the image file
    // - string paths to the image files
    to, {
      similarity = 0.9
    } = {}
  ) {
    super()
    this.#viewport = viewport
    this.#to = [].concat(to)

    this.#similarity = similarity
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

    return Promise.all(
      images.map(image => {
        const similarity = this.#compare(viewport.bitmap, image.bitmap)
        log('similarity', this.#viewport.object(), similarity)

        return similarity >= this.#similarity
      })
    )
  }

  #compare (from, to) {
    const {mssim} = ssim(from, to)
    return mssim
  }
}

module.exports = {
  ImageMatcher
}
