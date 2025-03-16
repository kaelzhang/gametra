const {
  setTimeout
} = require('node:timers/promises')
const {inspect} = require('node:util')

const {
  Action,
  ActionGroup
} = require('./action')
const {Pausable} = require('../util')

const {
  UNDEFINED
} = require('../const')

const MIN_INTERVAL = 20

const EVENT_CREATED = 'created'
const EVENT_IDLE = 'idle'
const EVENT_RESET = 'reset'
const EVENT_EXITED = 'exited'
const EVENT_FORK = 'fork'
const EVENT_FORKED = 'forked'
const EVENT_ERROR = 'error'


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
      // If already started, we should skip the start
      return
    }

    this.#args = args

    return this.#start()
  }

  async #start () {
    const when = this.#when
    const then = this.#then

    let last

    while (true) {
      await this.waitPause()

      const now = Date.now()

      if (last) {
        const wait = MIN_INTERVAL - (now - last)
        if (wait > 0) {
          await setTimeout(wait)
        }
      }

      last = now

      let yes = false

      try {
        yes = await when(...this.#args)
      } catch (error) {
        this.emit(EVENT_ERROR, error)
        continue
      }

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


const makeWhen = when => {
  if (when instanceof Action) {
    const action = when.queue(false)
    return (...args) => action.perform(...args)
  }

  return when
}


class Scheduler extends Pausable {
  #master
  #name
  #actions = []
  #completePromise
  #currentActions
  #args
  #withinEventHandler = false
  #started = false
  #hasExit = false
  #exited = false
  #exitResolve = UNDEFINED
  #emitsOnHold = []
  #whenevers = new Set()
  #forked = UNDEFINED

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

  [inspect.custom] () {
    const name = this.#name || 'no-name'
    return `[Scheduler: ${name}]`
  }

  name (name) {
    this.#name = name
    return this
  }

  #initEvents () {
    this.emit(EVENT_CREATED)
    this.emit(EVENT_IDLE)
  }

  emit (event, ...args) {
    if (this.paused) {
      this.#emitsOnHold.push([event, args])
      return
    }

    this.#emit(event, ...args)
  }

  #emit (event, ...args) {
    if (event === EVENT_ERROR) {
      super.emit(event, ...args)
      return
    }

    this.#withinEventHandler = true
    super.emit(event, this.add.bind(this), ...args)
    this.#withinEventHandler = false
  }

  pause () {
    if (this.#forked && this.#forked !== this) {
      // If we call pause() when the current scheduler is forked,
      // actually we want to pause the sub scheduler that it forked into
      this.#forked.pause()

      return
    }

    this.#pauseMonitors()

    if (this.#currentActions) {
      this.#currentActions.pause()
    }

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
    if (this.#forked && this.#forked !== this) {
      // If the current scheduler is forked,
      // actually we want to resume the sub scheduler that it forked into
      this.#forked.resume()
      return
    }

    const onHold = [].concat(this.#emitsOnHold)
    this.#emitsOnHold.length = 0

    for (const [event, args] of onHold) {
      this.#emit(event, ...args)
    }

    super.resume()

    this.#resumeActions()

    if (this.#currentActions) {
      this.#currentActions.resume()
    }

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

    whenever.on(EVENT_ERROR, error => {
      this.emit(EVENT_ERROR, {
        type: 'whenever-error',
        error,
        scheduler: this
      })
    })

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

      this.emit(EVENT_FORK)

      // The sub scheduler has been forked
      scheduler.emit(EVENT_FORKED)

      // Resume the sub scheduler and start it
      scheduler.resume()

      this.#forked = scheduler
      await scheduler.start(...this.#args)
      this.#forked = UNDEFINED

      // Resume the parent scheduler
      this.resume()

      whenever.resume()
    })

    this.#addWhenever(whenever)

    scheduler.on(EVENT_ERROR, error => {
      this.emit(EVENT_ERROR, error)
    })

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

      this.emit(EVENT_RESET)
      this.emit(EVENT_IDLE)

      whenever.resume()
    })

    this.#addWhenever(whenever)

    return this
  }

  #resetActions () {
    if (this.#currentActions) {
      this.#currentActions.cancel()
      this.#currentActions = UNDEFINED
    }

    // Cancel all actions
    for (const action of this.#actions) {
      action.cancel()
    }

    this.#actions.length = 0
  }

  exit (when) {
    this.#hasExit = true
    this.#registerExit(makeWhen(when))
    return this
  }

  #doExit () {
    // There might be multiple exit actions,
    // we should not resolve it again when it is already resolved
    if (this.#exitResolve) {
      this.#exitResolve()
    }
  }

  // Restart the scheduler,
  // clean all actions, and emit the idle event
  #registerExit (when) {
    const whenever = new Whenever(when).then(() => {
      this.#exited = true
      this.#resetActions()
      this.#doExit()

      whenever.resume()
    })

    this.#addWhenever(whenever)
  }

  async #waitExit () {
    if (!this.#hasExit) {
      return
    }

    const {promise, resolve} = Promise.withResolvers()
    this.#exitResolve = resolve

    await promise
    this.#exitResolve = UNDEFINED

    this.emit(EVENT_EXITED)
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

    this.#exited = false

    await Promise.all([
      this.#processActions(),
      this.#waitExit()
    ])

    if (!this.#master) {
      // If it is not the master scheduler,
      // pause it when the actions are drained
      this.pause()
    }

    resolve()
    this.#completePromise = UNDEFINED
  }

  async #processActions () {
    while (this.#started) {
      await this.waitPause()

      const actions = this.#actions.shift()

      if (!actions) {
        this.emit(EVENT_IDLE)

        if (this.#hasExit && !this.#exited) {
          continue
        } else {
          break
        }
      }

      this.#currentActions = actions

      await actions.onError(
        error => {
          this.emit(EVENT_ERROR, {
            type: 'action-error',
            error,
            scheduler: this
          })
        }
      ).perform(...this.#args)

      this.#currentActions = UNDEFINED
    }
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
