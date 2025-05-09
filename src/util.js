const log = require('node:util').debuglog('gametra')

const {Jimp} = require('jimp')
const {ssim} = require('ssim.js')

const {
  UNDEFINED
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


const compareImages = (from, to) => {
  const {mssim} = ssim(from, to)
  return mssim
}


class ForkChain {
  #previous

  constructor (chain = []) {
    this.#previous = chain
  }

  get #chain () {
    return [].concat(this.#previous)
  }

  // ForkChain represents the chain of nodes that before the current node,
  test (current, target) {
    const chain = this.#chain
    chain.push(current)

    const index = chain.indexOf(target)

    if (index === -1) {
      return
    }

    return chain.slice(index)
  }

  push (node) {
    const chain = this.#chain
    chain.push(node)
    return new ForkChain(chain)
  }
}


const createErrorInfo = raw => raw
  ? raw instanceof Error
    ? {
      error: raw
    }
    : raw
  : {}


module.exports = {
  log,
  Viewport,
  Point,
  compareImages,
  encodeNativeBMPImage,
  NotImplementedError,
  ForkChain,
  createErrorInfo
}
