const {
  USERAGENT_CHROME
} = require('../const')

const {
  Viewport
} = require('../util')


class Game {
  constructor ({
    url,
    userAgent = USERAGENT_CHROME,
    // The default ratio of the game window is 16:9
    width = 1280,
    height = 720
  }, delegate) {
    this._url = url
    this._userAgent = userAgent
    this._originalWidth = this._width = width
    this._originalHeight = this._height = height

    this._delegate = delegate
  }

  async launch () {
    await this._delegate.launch({
      url: this._url,
      width: this._width,
      height: this._height,
      userAgent: this._userAgent
    })
  }

  viewport (...args) {
    return new Viewport(...args)
  }

  async perform (action, options) {
    return await action.perform([this], options)
  }
}


const DELEGATE_METHODS = [
  'mouseMove',
  'mouseDown',
  'mouseUp',
  'mouseWheel',
  'keyDown',
  'keyUp',
  'screenshot'
]


DELEGATE_METHODS.forEach(method => {
  Game.prototype[method] = function (...args) {
    return this._delegate[method](...args)
  }
})


module.exports = {
  Game
}
