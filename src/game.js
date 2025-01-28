

const {
  ViewportDescripter
} = require('./matcher')
const {
  USERAGENT_CHROME
} = require('./const')


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

  viewport (...args) {
    return new ViewportDescripter(this._page, ...args)
  }

  async launch () {
    await this._delegate.launch({
      url: this._url,
      width: this._width,
      height: this._height,
      userAgent: this._userAgent
    })
  }

  async click (x, y) {
    await this._delegate.click(x, y)
  }

  async screenshot (x, y, width, height) {
    return await this._delegate.screenshot(x, y, width, height)
  }
}

module.exports = {
  Game
}
