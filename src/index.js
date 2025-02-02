const {Game} = require('./driver/game')
const {ElectronDelegate} = require('./delegate/electron')
const {Viewport} = require('./util')
const {
  Action,
  ThrottledPerformer,
  IntervalPerformer
} = require('./driver/action')
const {ImageMatcher} = require('./driver/matchers')

module.exports = {
  Game,
  Action,
  ThrottledPerformer,
  IntervalPerformer,
  ImageMatcher,
  ElectronDelegate,
  Viewport
}
