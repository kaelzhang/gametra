const {setTimeout} = require('node:timers/promises')

const {
  UNDEFINED,
  NotImplementedError,
  Pausable
} = require('../util')

const {Queue} = require('./queue')

const GLOBAL_ACTION_QUEUE = new Queue()


class Action extends Pausable {
  #partial
  #performers
  #runByPerformers
  #performerOptions
  #cancel
  #canceled = false
  #useQueue = true

  _perform () {
    throw new NotImplementedError(
      `${this.constructor.name}.prototype._perform is not implemented`
    )
  }

  async cancel () {
    if (this.#performers) {
      for (const performer of this.#performers) {
        performer.cancel()
      }
      this.#performers = UNDEFINED
    }

    if (typeof this._cancel === 'function') {
      return this._cancel()
    }
  }

  queue (useQueue = true) {
    this.#useQueue = useQueue
    return this
  }

  pause () {
    if (this.#performers) {
      for (const performer of this.#performers) {
        performer.pause()
      }
    }

    super.pause()
  }

  resume () {
    if (this.#performers) {
      for (const performer of this.#performers) {
        performer.resume()
      }
    }

    super.resume()
  }

  partial (...args) {
    this.#partial = args
    return this
  }

  options (options) {
    this.#performerOptions = options
    return this
  }

  #getArgs (args) {
    this.#checkPartial()

    if (!this.#partial) {
      return args
    }

    return [...this.#partial, ...args]
  }

  #checkPartial () {
    const {
      REQUIRED_ARGS = 0
    } = this.constructor

    const {length} = this.#partial || []
    if (length < REQUIRED_ARGS) {
      throw new Error(
        `${this.constructor.name}.prototype._perform requires ${REQUIRED_ARGS} arguments to be defined in advance by using .partial()`
      )
    }
  }

  async perform (...args) {
    this.#canceled = false
    const argList = this.#getArgs(args)

    return this.#initPerformers()
    ? this.#runByPerformers(...argList)
    : this.#performInQueue(...argList)
  }

  #performInQueue (...args) {
    return this.#useQueue
    // `_perform` is the smallest and atomic unit of action,
    // so it is always performed in the queue.
    // Also, `Queue` has an internal error handling mechanism
    ? GLOBAL_ACTION_QUEUE.add(() => this._perform(...args))
    // Unless we explicitly set `useQueue` to false.
    : this._perform(...args)
  }

  // Take the following Action class as an example:
  // ```
  // Class MyAction extends Action {
  //   static Performer = [PA, PB]
  // }
  // ```
  // -> (PA -> (PB -> action))
  //
  // Returns true if there are performers
  #initPerformers () {
    if (this.#performers) {
      // There are performers which have already been initialized
      return true
    }

    const Performer = this.constructor.Performer
    if (!Performer) {
      // No performer is defined
      return false
    }

    // Allow multiple performers to be used
    const Performers = [].concat(Performer)

    const performers = Performers
    .map(Performer => this.#generatePerformer(Performer))
    // [PB, PA]
    .reverse()

    this.#performers = performers

    // Execution order:
    // outside -> PA -> (PB -> action)
    this.#runByPerformers = performers.reduce((prev, performer) => {
      return (...args) => performer.perform(prev, ...args)
    }, this.#performInQueue.bind(this))

    return true
  }

  #generatePerformer (Performer) {
    const options = {
      // Performer class options
      ...(Performer.DEFAULT_OPTIONS || {}),
      // Class options
      ...(this.constructor.performerOptions || {}),
      // Instance options
      ...(this.#performerOptions || {})
    }

    return new Performer(options)
  }
}


module.exports = {
  Action
}
