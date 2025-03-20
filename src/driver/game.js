const {
  USERAGENT_CHROME
} = require('../constants')

const {
  Viewport
} = require('../util')

const {
  EventSynthesizer
} = require('./synthesizer')


class Game {
  #url
  #userAgent
  #originalWidth
  #originalHeight
  #width
  #height
  #delegate
  #synthesizer

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
    this.#synthesizer = new EventSynthesizer(delegate)
    // this.#scheduler = new Scheduler(this)
  }

  async launch () {
    await this.#delegate.launch({
      url: this.#url,
      width: this.#width,
      height: this.#height,
      userAgent: this.#userAgent
    })
  }

  async executeJavaScript (script) {
    return this.#delegate.executeJavaScript(script)
  }

  reload () {
    this.#delegate.reload()
  }

  viewport (...args) {
    return new Viewport(...args)
  }

  async perform (action) {
    return await action.perform(this)
  }

  _performDelegated (method, ...args) {
    return this.#delegate[method](...args)
  }

  _performSynthesized (method, ...args) {
    return this.#synthesizer[method](...args)
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
    return this._performDelegated(method, ...args)
  }
})


const SYNTHESIZED_METHODS = [
  'click',
  'press',
  'swipe'
]


SYNTHESIZED_METHODS.forEach(method => {
  Game.prototype[method] = function (...args) {
    return this._performSynthesized(method, ...args)
  }
})


module.exports = {
  Game
}
