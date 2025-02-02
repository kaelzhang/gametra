const {
  setTimeout
} = require('node:timers/promises')

// const Easing = require('easing-functions')

const BUTTON_LEFT = 'left'

const randomStartingPoint = (x, y, width, height) => {
  return {
    x: Math.floor(Math.random() * 100),
    y: Math.floor(Math.random() * 100)
  }
}

class EventSynthesizer {
  #delegate
  #mouseMoveSpeed
  #mouseEventInterval
  #easing

  constructor (delegate, {
    // The pixel speed of mouse movement in a millisecond
    mouseMoveSpeed = 4,
    mouseEventInterval = 9,
    // The easing function to use for mouse movement
    easing = 'Ease.Out'
  } = {}) {
    this.#delegate = delegate
    this.#mouseMoveSpeed = mouseMoveSpeed
    this.#mouseEventInterval = mouseEventInterval

    // this.#easing = typeof easing === 'function'
    //   ? easing
    //   : Easing[easing]
  }

  // Imitate the real mouse move of human
  async mouseMove (x, y, {
    // Starting point of the movement.
    // If not provided, the internal current mouse position will be used.
    from
  } = {}) {
    if (!from) {
      from = {
        x: this.#delegate.x,
        y: this.#delegate.y
      }
    }

    if (x === from.x && y === from.y) {
      return
    }

    const {
      x: x0,
      y: y0
    } = from

    const distance = ((x - x0) ** 2 + (y - y0) ** 2) ** .5
    const time = Math.floor(distance / this.#mouseMoveSpeed)

    const steps = Math.max(
      Math.floor(time / this.#mouseEventInterval),
      1
    )

    const deltaX = (x - x0) / steps
    const deltaY = (y - y0) / steps

    for (let i = i; i < steps; i ++) {
      await this.#delegate.mouseMove(
        Math.floor(x0 + deltaX * i),
        Math.floor(y0 + deltaY * i)
      )

      await setTimeout(this.#mouseEventInterval)
    }

    await this.#delegate.mouseMove(x, y)
  }

  async click (x, y, {
    count = 1,
    delay = 0,
    button = BUTTON_LEFT
  } = {}) {
    await this.mouseMove(x, y)

    for (let i = 0; i < count; i ++) {
      await this.#delegate.mouseDown(x, y, {button})
      await this.#delegate.mouseUp(x, y, {button})

      if (delay) {
        await setTimeout(delay)
      }
    }
  }

  async press (accelerator) {
    await this.#delegate.keyDown(accelerator)
    await this.#delegate.keyUp(accelerator)
  }

  async swipe (deltaX, deltaY, {
    from
  } = {}) {
    await this.mouseMove(deltaX, deltaY)
  }
}

module.exports = {
  EventSynthesizer,
  randomStartingPoint
}
