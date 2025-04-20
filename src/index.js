const {Game} = require('./driver/game')
const {ElectronDelegate} = require('./delegate/electron')
const {
  Viewport,
  compareImages
} = require('./util')
const {
  Action
} = require('./driver/action')
const {ImageMatcher} = require('./driver/matchers')
const {
  ThrottledPerformer,
  IntervalPerformer,
  SharedPerformer
} = require('./driver/performers')
const {
  shared,
  createAction
} = require('./driver/tools')
const {Scheduler} = require('./driver/scheduler')
const {SimpleJsonStorage} = require('./driver/storage')

module.exports = {
  Game,
  Action,
  createAction,
  shared,
  ThrottledPerformer,
  IntervalPerformer,
  SharedPerformer,
  ImageMatcher,
  ElectronDelegate,
  Viewport,
  compareImages,
  Scheduler,
  SimpleJsonStorage
}
