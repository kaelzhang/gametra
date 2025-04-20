const USERAGENT_CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'

const UNDEFINED = void 0

const BUTTON_LEFT = 'left'

function NOOP () {}

// When the scheduler is about to start
const EVENT_START = 'start'

// When the scheduler is idle
const EVENT_IDLE = 'idle'

const EVENT_ERROR = 'error'

///////////////////////////////////////////////////////////////
// For internal use only
const EVENT_DRAINED = Symbol('drained')
///////////////////////////////////////////////////////////////


const DO_EXIT = Symbol('#doExit')
const DO_RESET = Symbol('#doReset')
const DO_EMIT = Symbol('#doEmit')
const ON_ERROR_ONCE = Symbol('#onErrorOnce')

const KEY_GET_NAME = Symbol('#getName')
const KEY_REMOVE_ALL_LISTENERS = Symbol('#removeAllListeners')

const KEY_STORAGE = Symbol('#storage')

const KEY_PERFORM_DELEGATED = Symbol('#performDelegated')
const KEY_PERFORM_SYNTHESIZED = Symbol('#performSynthesized')
const KEY_PERFORM_STORAGE = Symbol('#performStorage')

module.exports = {
  USERAGENT_CHROME,
  UNDEFINED,
  BUTTON_LEFT,
  NOOP,

  EVENT_START,
  EVENT_IDLE,
  EVENT_ERROR,
  EVENT_DRAINED,

  DO_EXIT,
  DO_RESET,
  DO_EMIT,
  ON_ERROR_ONCE,
  KEY_GET_NAME,
  KEY_REMOVE_ALL_LISTENERS,
  KEY_STORAGE,

  KEY_PERFORM_DELEGATED,
  KEY_PERFORM_SYNTHESIZED,
  KEY_PERFORM_STORAGE
}
