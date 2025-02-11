const {
  setTimeout
} = require('node:timers/promises')

const {Action} = require('./action')
const {Pausable} = require('../util')

const {
  UNDEFINED
} = require('../const')

class Whenever extends Pausable {
  #when
  #then
  #args

  constructor (when) {
    super()
    this.#when = when
  }

  then (then) {
    this.#then = then
    return this
  }

  start (...args) {
    if (this.#args) {
      throw new Error('A Whenever should not be started more than once')
    }

    this.#args = args

    return this.#start()
  }

  async #start () {
    const when = this.#when
    const then = this.#then

    while (true) {
      await this.waitPause()

      const yes = await when(...this.#args)

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
      }
    }
  }
}


class ActionGroup {
  #actions

  constructor (actions) {
    this.#actions = actions
  }

  cancel () {
    this.#apply('cancel')
  }

  pause () {
    this.#apply('pause')
  }

  resume () {
    this.#apply('resume')
  }

  #apply (method) {
    for (const action of this.#actions) {
      action[method]()
    }
  }

  perform (...args) {
    return Promise.all(this.#actions.map(action => action.perform(...args)))
  }
}


const makeWhen = when => when instanceof Action
  ? (...args) => when.perform(...args)
  : when


class Scheduler extends Pausable {
  #master
  #actions = []
  #completePromise
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

    // Pause all actions, including the current one
    this.#pauseActions()

    super.pause()
  }

  #pauseActions () {
    for (const action of this.#actions) {
      action.pause()
    }
  }

  resume () {
    const onHold = [].concat(this.#emitsOnHold)
    this.#emitsOnHold.length = 0

    for (const event of onHold) {
      this.#emit(event)
    }

    super.resume()

    this.#resumeActions()

    this.#resumeMonitors()
  }

  #resumeActions () {
    for (const action of this.#actions) {
      action.resume()
    }
  }

  add (...actions) {
    if (!this.#withinEventHandler) {
      // The scheduler is a way to manage the lifecycle of a series of jobs,
      // so we should not add actions outside events
      throw new Error('You should not add actions outside of an event handler')
    }

    this.#actions.push(new ActionGroup(actions))

    // Already initialized
    if (this.#master && this.#args) {
      // Then try to start the master scheduler again
      this.#start()
    }
  }

  #addWhenever (whenever) {
    this.#whenevers.add(whenever)

    if (this.paused) {
      whenever.pause()
    }

    if (this.#started) {
      whenever.start(...this.#args)
    }
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

  #startMonitors () {
    for (const whenever of this.#whenevers) {
      whenever.start(...this.#args)
    }
  }

  fork (when, ...rest) {
    return this.#fork(makeWhen(when), ...rest)
  }

  // Create a forked branch of the scheduler
  #fork (
    when,
    // Two scheduler should fork into a same scheduler,
    // otherwise, a new scheduler will be created
    scheduler = new Scheduler({
      master: false
    })
  ) {
    const whenever = new Whenever(when).then(async () => {
      // Pause the parent scheduler,
      // which will also pause the whenever
      this.pause()

      this.emit('fork')

      // The sub scheduler has been forked
      scheduler.emit('forked')

      // Resume the sub scheduler and start it
      scheduler.resume()
      await scheduler.start(...this.#args)

      // Resume the parent scheduler
      this.resume()

      whenever.resume()
    })

    this.#addWhenever(whenever)

    return scheduler
  }

  reset (when) {
    return this.#reset(makeWhen(when))
  }

  // Restart the scheduler,
  // clean all actions, and emit the idle event
  #reset (when) {
    const whenever = new Whenever(when).then(() => {
      this.#resetActions()

      this.emit('reset')
      this.emit('idle')

      whenever.resume()
    })

    this.#addWhenever(whenever)

    return this
  }

  #resetActions () {
    // Cancel all actions
    for (const action of this.#actions) {
      action.cancel()
    }

    this.#actions.length = 0
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
      this.#args = args
      this.#startMonitors()
    }

    await this.#start()
  }

  get started () {
    return this.#started
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

      const actions = this.#actions.shift()

      if (!actions) {
        break
      }

      await actions.perform(...this.#args)
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
