const {
  Action
} = require('./action')


const {
  SharedPerformer,
  ThrottledPerformer
} = require('./performers')


const shared = (fn, {
  throttle = 100,
  queue = false
} = {}) => {
  class _SharedAction extends Action {
    static Performer = [SharedPerformer, ThrottledPerformer]
    static performerOptions = {
      throttle
    }

    async _perform (...args) {
      return fn(...args)
    }
  }

  // Always disable queueing for atomic tasks
  const action = new _SharedAction().queue(queue)

  return (...args) => action.perform(...args)
}


module.exports = {
  shared
}
