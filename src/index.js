const {Game} = require('./driver/game')
const {ElectronDelegate} = require('./delegate/electron')
const {Viewport} = require('./util')
const {Action} = require('./driver/action')
const {ImageMatcher} = require('./driver/matchers')
const {
  ThrottledPerformer,
  IntervalPerformer,
  SharedPerformer
} = require('./driver/performers')

module.exports = {
  Game,
  Action,
  ThrottledPerformer,
  IntervalPerformer,
  SharedPerformer,
  ImageMatcher,
  ElectronDelegate,
  Viewport
}
