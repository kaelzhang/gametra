const EventEmitter = require('node:events')
const log = require('node:util').debuglog('gametra')

const {Jimp} = require('jimp')

const {UNDEFINED} = require('./const')


class Viewport {
  constructor(x, y, width, height) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }

  object () {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    }
  }
}


class Point {
  constructor (x, y) {
    this.x = x
    this.y = y
  }
}


// Converts Electron's nativeImage bitmap (BGRA) to RGBA format
// which is required by Jimp
const BGRAtoRGBA = bitmapBuffer => {
  const rgbaBuffer = Buffer.alloc(bitmapBuffer.length);

  for (let i = 0; i < bitmapBuffer.length; i += 4) {
    rgbaBuffer[i] = bitmapBuffer[i + 2]
    rgbaBuffer[i + 1] = bitmapBuffer[i + 1]
    rgbaBuffer[i + 2] = bitmapBuffer[i]
    rgbaBuffer[i + 3] = bitmapBuffer[i + 3]
  }

  return rgbaBuffer
}


const encodeNativeBMPImage = nativeImage => {
  const buffer = nativeImage.toBitmap()
  const {
    width,
    height
  } = nativeImage.getSize()

  const image = Jimp.fromBitmap({
    data: BGRAtoRGBA(buffer),
    width,
    height
  })

  return image
}


class NotImplementedError extends Error {
  constructor (message) {
    super(message)
    this.name = 'NotImplementedError'
  }
}


class Pausable extends EventEmitter {
  #pausePromise
  #pauseResolve

  get paused () {
    return !!this.#pausePromise
  }

  pause () {
    const {promise, resolve} = Promise.withResolvers()

    this.#pausePromise = promise
    this.#pauseResolve = resolve
  }

  resume () {
    if (this.#pauseResolve) {
      this.#pauseResolve()
    }

    this.#pausePromise = UNDEFINED
    this.#pauseResolve = UNDEFINED
  }

  // Could be used in the _perform method of a sub class
  async waitPause () {
    if (this.#pausePromise) {
      return this.#pausePromise
    }
  }
}


module.exports = {
  log,
  Viewport,
  Point,
  Pausable,
  encodeNativeBMPImage,
  NotImplementedError
}
