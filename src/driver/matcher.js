const {setTimeout} = require('node:timers/promises')
const {ssim} = require('ssim.js')
const bmp = require('bmp-js')

console.log('ssim', ssim)

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


// Converts Electron's nativeImage bitmap to ImageData-like object for ssim.js
const convertBitmapToImageData = (bitmapBuffer, width, height) => {
  // Electron's toBitmap() returns BGRA format
  // ssim.js expects RGBA, so we need to convert it
  const rgbaBuffer = Buffer.alloc(bitmapBuffer.length);

  for (let i = 0; i < bitmapBuffer.length; i += 4) {
    rgbaBuffer[i] = bitmapBuffer[i + 2]     // R
    rgbaBuffer[i + 1] = bitmapBuffer[i + 1] // G
    rgbaBuffer[i + 2] = bitmapBuffer[i]     // B
    rgbaBuffer[i + 3] = bitmapBuffer[i + 3] // A
  }

  return {
    data: new Uint8Array(rgbaBuffer),
    width,
    height
  }
}


class ImageMatcher extends IntervalMatcher {
  constructor (
    game,
    viewport,
    // The target image buffer to match
    to, {
      checkInterval = 100,
      similarity = 0.9
    } = {}
  ) {
    super(checkInterval)
    this._game = game
    this._viewport = viewport
    this._to = to
    this._similarity = similarity
  }

  async _check () {
    const viewport = await this._game.screenshot(this._viewport)
    const {width, height} = viewport.getSize()

    const viewportImageData = convertBitmapToImageData(
      viewport.toBitmap(), width, height
    )

    console.log('this.to', this._to)

    const toDecoded = bmp.decode(this._to)
    const toImageData = {
      data: new Uint8Array(toDecoded.data),
      width: toDecoded.width,
      height: toDecoded.height
    }

    // Compare the similarity between `viewport` and `this._to`,
    const similarity = this._compare(viewportImageData, toImageData)

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
