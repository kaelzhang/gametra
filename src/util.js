const log = require('node:util').debuglog('gametra')

const {Jimp} = require('jimp')

const {
  UNDEFINED,
  EVENT_PAUSED
} = require('./constants')


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
    // Convert BGRA which is the native format of Electron
    // to RGBA which is required by Jimp and more widely used
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


module.exports = {
  log,
  Viewport,
  Point,
  encodeNativeBMPImage,
  NotImplementedError
}
