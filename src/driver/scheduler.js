const {
  setTimeout
} = require('node:timers/promises')

const {Pausable} = require('../util')

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
        if (this.paused) {
          // If already paused, we should skip the processing of `then`,
          // and wait for the scheduler to resume, and restart checking again,
          // because the checking result might be out-dated
          continue
        }

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
  #started = false
  #emitsOnHold = []
  #whenevers = new Set()

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
  }

  #initEvents () {
    this.emit('created')
    this.emit('idle')
  }

  emit (event) {
    if (this.paused) {
      this.#emitsOnHold.push(event)
      return
    }

    this.#emit(event)
  }

  #emit (event) {
    this.#withinEventHandler = true
    super.emit(event, this.add.bind(this))
    this.#withinEventHandler = false
  }

  pause () {
    this.#pauseMonitors()
    super.pause()
  }

  resume () {
    const onHold = [].concat(this.#emitsOnHold)
    this.#emitsOnHold.length = 0

    for (const event of onHold) {
      this.#emit(event)
    }

    super.resume()
    this.#resumeMonitors()
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

  #addWhenever (whenever) {
    this.#whenevers.add(whenever)
  }

  #pauseMonitors () {
    for (const whenever of this.#whenevers) {
      whenever.pause()
    }
  }

  #resumeMonitors () {
    for (const whenever of this.#whenevers) {
      whenever.resume()
    }
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

      // Pause the parent scheduler
      this.pause()

      this.emit('fork')

      // Resume the sub scheduler and start it
      scheduler.resume()
      await scheduler.start(...this.#args)

      // Resume the parent scheduler
      this.resume()

      if (this.#currentAction) {
        this.#currentAction.resume()
      }

      whenever.resume()
    })

    this.#addWhenever(whenever)

    return scheduler
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
    if (this.#master && this.#started) {
      throw new Error(
        'The master scheduler should not be started more than once'
      )
    }

    if (!this.#started) {
      // Initialize the events only once
      this.#initEvents()
      this.#started = true
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

    while (this.#started) {
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

  // Resolves when the scheduler completes all actions
  async complete () {
    return this.#completePromise
  }
}


module.exports = {
  Whenever,
  Scheduler
}
