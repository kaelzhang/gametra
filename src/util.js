const log = require('node:util').debuglog('gametra')

const bmp = require('bmp-js')

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


// Converts Electron's nativeImage bitmap (BGRA) to ABGR format bmp-js
// so that it can be properly saved as a BMP file
const BGRAtoABGR = bitmapBuffer => {
  const abgrBuffer = Buffer.alloc(bitmapBuffer.length);

  for (let i = 0; i < bitmapBuffer.length; i += 4) {
    abgrBuffer[i] = bitmapBuffer[i + 3]
    abgrBuffer[i + 1] = bitmapBuffer[i]
    abgrBuffer[i + 2] = bitmapBuffer[i + 1]
    abgrBuffer[i + 3] = bitmapBuffer[i + 2]
  }

  return abgrBuffer
}


// Encode the BMP buffer got from Electron's nativeImage
//
const encodeNativeBMPImage = image => {
  const rawImageBuffer = image.toBitmap()
  const {
    width,
    height
  } = image.getSize()

  const encoded = bmp.encode({
    data: BGRAtoABGR(rawImageBuffer),
    width,
    height
  })

  return {
    data: encoded.data,
    width,
    height
  }
}


module.exports = {
  log,
  Viewport,
  encodeNativeBMPImage
}
