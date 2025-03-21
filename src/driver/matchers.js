const {Jimp} = require('jimp')
const {ssim} = require('ssim.js')

const {
  Action,
  IntervalPerformer
} = require('./action')

const {
  log
} = require('../util')


const DEFAULT_GET_SCREENSHOT = (game, viewport) => game.screenshot(viewport)

const DEFAULT_COMPARE = (from, to) => {
  const {mssim} = ssim(from, to)
  return mssim
}


class ImageMatcher extends Action {
  #viewport
  #to
  #toPromise
  #getScreenshot
  #compare

  constructor (
    viewport,
    // The target image buffer to match, could be either
    // - a string path to the image file
    // - string paths to the image files
    to,
    {
      getScreenshot = DEFAULT_GET_SCREENSHOT,
      compare = DEFAULT_COMPARE
    } = {}
  ) {
    super()
    this.#viewport = viewport
    this.#to = [].concat(to)
    this.#getScreenshot = getScreenshot
    this.#compare = compare
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
    const getScreenshot = this.#getScreenshot

    const [viewport, images] = await Promise.all([
      getScreenshot(game, this.#viewport),
      this.#targetImages()
    ])

    const similarities = images.map(
      image => this.#compare(viewport.bitmap, image.bitmap)
    )

    log('image matcher similarities', similarities)

    return similarities
  }
}

module.exports = {
  ImageMatcher
}
