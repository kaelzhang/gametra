const {
  setImmediate,
  setTimeout
} = require('node:timers/promises')

const {Pausable} = require('./action')

const {
  UNDEFINED
} = require('../const')

class Whenever extends Pausable {
  #when
  #then
  #promise

  constructor (when) {
    super()
    this.#when = when
  }

  then (then) {
    this.#then = then
    this.#start()
    return this
  }

  async #start () {
    const when = this.#when
    const then = this.#then

    while (true) {
      await this.waitPause()

      const yes = await when()

      // Only if the condition is true,
      // it will go into the then block
      if (yes) {
        await then()
        // Pause the whenever when the condition is true
        this.pause()
      }
    }
  }
}

class Scheduler extends Pausable {
  #master
  #actions = []
  #completePromise
  #currentAction
  #args
  #withinEventHandler = false
  #whenevers = new Set()
  #nonPausedWhenevers = new Set()
  #forked = new Set()

  constructor ({
    master = true
  } = {}) {
    super()

    this.#master = master

    if (!master) {
      // A non-master scheduler is paused by default,
      // so that it won't start automatically
      this.pause()
    }

    this.emit('created')
    this.emit('idle')
  }

  emit (event, handler) {
    this.#withinEventHandler = true
    super.emit(event, handler)
    this.#withinEventHandler = false
    return this
  }

  add (action) {
    if (!this.#withinEventHandler) {
      // The scheduler is a way to manage the lifecycle of a series of jobs,
      // so we should not add actions outside events
      throw new Error('You should not add actions outside of an event handler')
    }

    this.#actions.push(action)

    // Already initialized
    if (this.#master && this.#args) {
      // Then try to start the scheduler again
      this.#start()
    }
  }

  // Resolves when the scheduler completes all actions
  async complete () {
    return this.#completePromise
  }

  // Create a forked branch of the scheduler
  fork (
    when,
    // Two scheduler should fork into a same scheduler,
    // otherwise, a new scheduler will be created
    scheduler = new Scheduler({
      master: false
    })
  ) {
    const whenever = new Whenever(when).then(async () => {
      // Pause the current action
      if (this.#currentAction) {
        this.#currentAction.pause()
      }

      this.emit('fork')

      // Resume the sub scheduler
      scheduler.resume()
      await scheduler.start(...this.#args)

      if (this.#currentAction) {
        this.#currentAction.resume()
      }

      whenever.resume()
    })

    this.#addWhenever(whenever)
    this.#forked.add(scheduler)

    return scheduler
  }

  #addWhenever (whenever) {
    this.#whenevers.add(whenever)
  }

  pauseMonitors () {
    for (const whenever of this.#whenevers) {
      if (!whenever.paused) {
        whenever.pause()
        this.#nonPausedWhenevers.add(whenever)
      }
    }

    for (const forked of this.#forked) {
      forked.pauseMonitors()
    }
  }

  resumeMonitors () {
    for (const whenever of this.#nonPausedWhenevers) {
      whenever.resume()
    }

    this.#nonPausedWhenevers.clear()

    for (const forked of this.#forked) {
      forked.resumeMonitors()
    }
  }

  // Restart the scheduler,
  // clean all actions, and emit the idle event
  reset (when) {
    const whenever = new Whenever(when).then(() => {
      this.#actions.length = 0

      if (this.#currentAction) {
        this.#currentAction.cancel()
        this.#currentAction = UNDEFINED
      }

      if (!this.#master) {
        this.pause()
      }

      this.emit('reset')
      this.emit('idle')

      whenever.resume()
    })

    this.#addWhenever(whenever)

    return this
  }

  async start (...args) {
    if (this.#master && this.#args) {
      throw new Error('The master scheduler should not be started twice')
    }

    this.#args = args

    await this.#start()
  }

  async #start () {
    if (this.#completePromise) {
      // Do not restart the scheduler again
      return this.#completePromise
    }

    const {promise, resolve} = Promise.withResolvers()
    this.#completePromise = promise

    while (true) {
      await this.waitPause()

      const action = this.#actions.shift()

      if (!action) {
        break
      }

      this.#currentAction = action
      await action.perform(...this.#args)
      this.#currentAction = UNDEFINED
    }

    if (!this.#master) {
      // If it is not the master scheduler,
      // pause it when the actions are drained
      this.pause()
    }

    resolve()
    this.#completePromise = UNDEFINED

    // Event 'idle' must be emitted after `resolve()`
    this.emit('idle')
  }
}


module.exports = {
  Scheduler
}
