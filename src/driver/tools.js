const {
  Action
} = require('./action')


const {
  SharedPerformer,
  ThrottledPerformer
} = require('./performers')


const shared = (fn, {
  throttle = 100,
  // Disable queueing for atomic tasks by default
  queue = false
} = {}) => {
  class _SharedAction extends Action {
    static PERFORMER = [SharedPerformer, ThrottledPerformer]
    static PERFORMER_OPTIONS = {
      throttle
    }

    async _perform (...args) {
      return fn(...args)
    }
  }

  const action = new _SharedAction().queue(queue)

  return (...args) => action.perform(...args)
}


const createAction = (perform, performer, PERFORMER_OPTIONS) => {
  class _Action extends Action {
    static PERFORMER = performer
    static PERFORMER_OPTIONS = PERFORMER_OPTIONS

    async _perform (...args) {
      return perform(...args)
    }
  }

  return new _Action()
}


module.exports = {
  shared,
  createAction
}

