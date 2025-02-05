const {
  setTimeout
} = require('node:timers/promises')

const Easing = require('easing-functions')

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
    mouseEventInterval = 12,
    // The easing function to use for mouse movement,
    // defaults to `Quadratic.Out` (fast -> slow )
    easing = 'Quadratic.Out'
  } = {}) {
    this.#delegate = delegate
    this.#mouseMoveSpeed = mouseMoveSpeed
    this.#mouseEventInterval = mouseEventInterval

    this.#easing = typeof easing === 'function'
      ? easing
      : Easing[easing]
  }

  // Imitate the real mouse move of human
  async mouseMove (x, y) {
    const x0 = this.#delegate.x
    const y0 = this.#delegate.y

    const distance = ((x - x0) ** 2 + (y - y0) ** 2) ** .5
    const time = Math.floor(distance / this.#mouseMoveSpeed)

    const steps = Math.floor(time / this.#mouseEventInterval)

    if (steps > 1) {
      const deltaX = x - x0
      const deltaY = y - y0

      for (let i = 1; i < steps; i ++) {
        const t = this.#mouseEventInterval * i / time

        // `delegate#mouseMove` already rounds the coordinates to integers
        await this.#delegate.mouseMove(
          x0 + deltaX * this.#easing(t),
          y0 + deltaY * this.#easing(t)
        )

        await setTimeout(this.#mouseEventInterval)
      }
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
      await this.#delegate.mouseDown({button})
      await this.#delegate.mouseUp({button})

      if (delay) {
        await setTimeout(delay)
      }
    }
  }

  async press (accelerator) {
    await this.#delegate.keyDown(accelerator)
    await this.#delegate.keyUp(accelerator)
  }

  async swipe (deltaX, deltaY) {
    await this.#delegate.mouseDown()
    await this.mouseMove(
      this.#delegate.x + deltaX,
      this.#delegate.y + deltaY
    )
    await this.#delegate.mouseUp()
  }
}

module.exports = {
  EventSynthesizer,
  randomStartingPoint
}
