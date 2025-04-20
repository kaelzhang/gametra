const {
  USERAGENT_CHROME,
  KEY_STORAGE,
  KEY_PERFORM_DELEGATED,
  KEY_PERFORM_SYNTHESIZED,
  KEY_PERFORM_STORAGE
} = require('../constants')

const {
  Viewport
} = require('../util')
const { SimpleJsonStorage } = require('./storage')

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
  #storage

  constructor (delegate, url, {
    storage = new SimpleJsonStorage({
      path: '.storage.json'
    }),
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
    this.#delegate[KEY_STORAGE](storage)

    this.#storage = storage

    this.#synthesizer = new EventSynthesizer(delegate)
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

  [KEY_PERFORM_DELEGATED] (method, ...args) {
    return this.#delegate[method](...args)
  }

  [KEY_PERFORM_SYNTHESIZED] (method, ...args) {
    return this.#synthesizer[method](...args)
  }

  [KEY_PERFORM_STORAGE] (method, ...args) {
    return this.#storage[method](...args)
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
    return this[KEY_PERFORM_DELEGATED](method, ...args)
  }
})


const SYNTHESIZED_METHODS = [
  'click',
  'press',
  'swipe'
]

SYNTHESIZED_METHODS.forEach(method => {
  Game.prototype[method] = function (...args) {
    return this[KEY_PERFORM_SYNTHESIZED](method, ...args)
  }
})


const STORAGE_METHODS = [
  'load',
  'save',
  'update'
]

STORAGE_METHODS.forEach(method => {
  const gameMethod = `${method}Storage`

  Game.prototype[gameMethod] = function (...args) {
    return this[KEY_PERFORM_STORAGE](method, ...args)
  }
})


module.exports = {
  Game
}
