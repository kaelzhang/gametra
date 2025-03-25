const test = require('ava')
const log = require('util').debuglog('gametra')
const {join} = require('node:path')

const {
  ImageMatcher,
  Viewport,
  SharedPerformer,
  ThrottledPerformer
} = require('..')


test('image matcher', async t => {
  class _ImageMatcher extends ImageMatcher {
    static PERFORMER = [SharedPerformer]
  }

  const matcher = new _ImageMatcher(
    new Viewport(0, 0, 100, 100),
    [
      join(__dirname, 'fixtures', 'ds.bmp'),
    ],
    {
      // Just a mock one
      getScreenshot () {
        return {
          bitmap: {}
        }
      },
      compare () {
        throw new Error('test')
      }
    }
  )

  await t.throwsAsync(async () => {
    await matcher.perform()
  }, {
    message: 'test'
  })
})

