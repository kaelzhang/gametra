// ActionGroup is a group container of actions,
// - it will handles the error of the actions
// - it will not interrupt the other actions if one of the actions failed
// - only exits when all actions are done or failed
class ActionGroup {
  #actions
  #onError = NOOP

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

  onError (fn) {
    this.#onError = fn
    return this
  }

  perform (...args) {
    const onError = this.#onError
    this.#onError = NOOP

    return Promise.all(
      this.#actions.map(
        action => action.perform(...args).catch(onError)
      )
    )
  }
}


module.exports = {
  ActionGroup
}
