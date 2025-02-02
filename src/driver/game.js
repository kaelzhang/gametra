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

  constructor (delegate, url, {
    userAgent = USERAGENT_CHROME,
    // The default ratio of the game window is 16:9
    width = 1280,
    height = 720
  } = {}) {
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

  _performDelegate (method, ...args) {
    return this.#delegate[method](...args)
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
    return this._performDelegate(method, ...args)
  }
})


const SYNTHESIZED_METHODS = [
  'mouseMove',
  'mouseDown',
  'mouseUp',
  'mouseWheel',
  'keyDown',
  'keyUp'
]




module.exports = {
  Game
}
