const USERAGENT_CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'

const UNDEFINED = void 0

const BUTTON_LEFT = 'left'

function NOOP () {}

// When the scheduler is about to start
const EVENT_START = 'start'

// When the scheduler is idle
const EVENT_IDLE = 'idle'

// When the scheduler is about to exit (before exiting)
const EVENT_EXIT = 'exit'

// When the scheduler forks, before the forked scheduler is started
const EVENT_FORK = 'fork'
const EVENT_BACK = 'back'

const EVENT_ERROR = 'error'

///////////////////////////////////////////////////////////////
// For internal use only
const EVENT_DRAINED = Symbol('drained')
///////////////////////////////////////////////////////////////


const DO_EXIT = Symbol('#doExit')
const DO_RESET = Symbol('#doReset')
const DO_EMIT = Symbol('#doEmit')
const DO_EMIT_ASYNC = Symbol('#doEmitAsync')


module.exports = {
  USERAGENT_CHROME,
  UNDEFINED,
  BUTTON_LEFT,
  NOOP,

  EVENT_START,
  EVENT_IDLE,
  EVENT_EXIT,
  EVENT_FORK,
  EVENT_BACK,
  EVENT_ERROR,
  EVENT_DRAINED,

  DO_EXIT,
  DO_RESET,
  DO_EMIT,
  DO_EMIT_ASYNC
}
