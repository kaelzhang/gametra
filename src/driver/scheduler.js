const {
  setTimeout,
  setImmediate
} = require('node:timers/promises')

const {
  Action,
  ActionGroup
} = require('./action')
const {Pausable} = require('./pausable')
const {Cargo} = require('./cargo')
const {createAction} = require('./tools')

const {
  UNDEFINED,
  EVENT_START,
  EVENT_IDLE,
  EVENT_EXIT,
  EVENT_FORK,
  EVENT_BACK,
  EVENT_ERROR,
  EVENT_DRAINED
} = require('../constants')

const MIN_INTERVAL = 20


const makeWhen = when => {
  if (when instanceof Action) {
    return when
  }

  return createAction(when)
}


class Whenever extends Pausable {
  #when
  #then
  #args

  constructor (when) {
    super()
    this.#when = makeWhen(when)
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
        yes = await when.perform(...this.#args)
      } catch (error) {
        this.emit(EVENT_ERROR, {
          type: 'whenever-error',
          error,
          host: when
        })
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


class Scheduler extends Pausable {
  #master
  #cargo
  #completePromise
  #args
  #inited = false
  #hasExit = false
  #exited = false
  #exitResolve = UNDEFINED
  #cargoResolve = UNDEFINED
  #whenevers = new Set()
  #forked = UNDEFINED
  #addAction
  #performAction

  constructor ({
    master = true
  } = {}) {
    super()

    this.#addAction = this.#add.bind(this)
    this.#performAction = this.#perform.bind(this)

    this.#cargo = new Cargo()
    .onError(error => {
      this.emit(EVENT_ERROR, error)
    })

    this.#master = master

    if (!master) {
      // A non-master scheduler is paused by default,
      // so that it won't start automatically
      this.pause()
      this.#cargo.pause()
    }
  }

  get master () {
    return this.#master
  }

  emit (event, payload) {
    if (event === EVENT_ERROR) {
      const scheduler = payload.scheduler || this

      return super.emit(event, {
        ...payload,
        scheduler
      })
    }

    return super.emit(event, this.#addAction)
  }

  #emitAsync (event) {
    return super.emitAsync(event, this.#performAction)
  }

  #reset () {
    this.#cargo.reset()
    this.pause()
  }

  pause () {
    if (this.#forked) {
      // If we call pause() when the current scheduler is forked,
      // actually we want to pause the sub scheduler that it forked into
      this.#forked.pause()
      return
    }

    this.#pauseMonitors()

    this.#cargo.pause()

    super.pause()
  }

  resume () {
    if (this.#forked) {
      // If the current scheduler is forked,
      // actually we want to resume the sub scheduler that it forked into
      this.#forked.resume()
      return
    }

    super.resume()

    this.#cargo.resume()

    this.#resumeMonitors()
  }

  #add (...actions) {
    this.#cargo.add(...actions)
  }

  #perform (...actions) {
    return Promise.all(
      actions.map(
        action => action.perform(...this.#args).catch(error => {
          this.emit(EVENT_ERROR, {
            type: 'action-error',
            error,
            host: action
          })
        })
      )
    )
  }

  #addWhenever (whenever) {
    this.#whenevers.add(whenever)

    whenever.on(EVENT_ERROR, error => {
      this.emit(EVENT_ERROR, error)
    })

    if (this.paused) {
      whenever.pause()
    }

    if (this.#inited) {
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
    return this.#fork(when, ...rest)
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
    if (scheduler.master) {
      throw new Error('A scheduler should not fork into a master scheduler')
    }

    // TODO: Test circular dependency
    if (scheduler === this) {
      throw new Error(
        'A scheduler should not fork into itself'
      )
    }

    const whenever = new Whenever(when).then(async () => {
      // We could do something before the forked scheduler starts
      await this.#emitAsync(EVENT_FORK)

      // Pause the parent scheduler,
      // which will also pause the whenever
      this.pause()

      this.#forked = scheduler
      await scheduler.start(...this.#args)
      this.#forked = UNDEFINED

      // Resume the parent scheduler
      this.resume()

      whenever.resume()
      await this.#emitAsync(EVENT_BACK)
    })

    this.#addWhenever(whenever)

    scheduler.on(EVENT_ERROR, errorInfo => {
      this.emit(EVENT_ERROR, errorInfo)
    })

    return scheduler
  }

  exit (when) {
    if (this.#master) {
      throw new Error('The master scheduler should not exit')
    }

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
      this.#cargo.reset()
      this.#releaseCargo()
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
  }

  async start (...args) {
    if (!this.#inited) {
      // Initialize the events only once
      this.#inited = true
      this.#args = args
      this.#startMonitors()
      this.#cargo.args(args)
    }

    await this.#start()
  }

  async #start () {
    if (this.#completePromise) {
      return this.#completePromise
    }

    const {promise, resolve} = Promise.withResolvers()
    this.#completePromise = promise

    this.resume()

    this.emit(EVENT_START)
    this.emit(EVENT_IDLE)

    this.#exited = false

    await Promise.all([
      this.#startCargo(),
      this.#waitExit()
    ])

    // We could do something before the scheduler completely exits
    await this.#emitAsync(EVENT_EXIT)

    this.#reset()

    resolve()
    this.#completePromise = UNDEFINED
  }

  async #startCargo () {
    const {promise, resolve} = Promise.withResolvers()
    this.#cargoResolve = resolve

    const onDrained = () => {
      if (
        // Has exit action, and it is not exited yet
        this.#hasExit && !this.#exited
        // Or it is the master scheduler
        || this.#master
      ) {
        this.emit(EVENT_IDLE)
        return
      }

      this.#cargo.reset()
      this.#releaseCargo()
    }

    this.#cargo
    .on(EVENT_DRAINED, onDrained)
    .check()

    return promise
  }

  #releaseCargo () {
    if (this.#cargoResolve) {
      this.#cargoResolve()
      this.#cargoResolve = UNDEFINED
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
