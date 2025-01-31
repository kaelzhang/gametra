const {
  USERAGENT_CHROME
} = require('../const')

const {
  Viewport
} = require('../util')


class Game {
  #url
  #userAgent
  #originalWidth
  #originalHeight
  #width
  #height
  #delegate

  constructor ({
    url,
    userAgent = USERAGENT_CHROME,
    // The default ratio of the game window is 16:9
    width = 1280,
    height = 720
  }, delegate) {
    this.#url = url
    this.#userAgent = userAgent
    this.#originalWidth = this.#width = width
    this.#originalHeight = this.#height = height

    this.#delegate = delegate
  }

  async launch () {
    await this.#delegate.launch({
      url: this.#url,
      width: this.#width,
      height: this.#height,
      userAgent: this.#userAgent
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
    return this.#delegate[method](...args)
  }
})


module.exports = {
  Game
}
