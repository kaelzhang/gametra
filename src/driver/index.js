const puppeteer = require('puppeteer')

const USERAGENT_CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'


class Game {
  constructor({
    // URL of the web game
    // usually, a cloud web game is a single-page application
    url,
    headless = true
  } = {}) {
    this._url = url
    this._headless = headless
  }

  viewport (...args) {
    return new ViewportDescripter(this._page, ...args)
  }

  async launch () {
    this._browser = await puppeteer.launch({
      headless: this._headless,
      defaultViewport: null,
      args: ['--start-maximized']
    })
    this._page = await this._browser.newPage()

    const page = this._page
    await page.setUserAgent(USERAGENT_CHROME)
    await page.goto(this._url)
  }

  // await game.waitUntil(
  //   new ViewportMatcher(
  //     game.viewport(x, y, w, h),
  //     image,
  //     {similarity: 0.8}
  //   )
  // )
  waitUntil (matcher) {
    return matcher.success()
  }

  async click (x, y) {
    // Start clicking interval
    await this._page.mouse.click(x, y)
  }

  // async keypress () {

  // }

  close () {
    return this._browser?.close()
  }
}


module.exports = {
  Game
}
