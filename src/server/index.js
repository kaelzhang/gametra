const puppeteer = require('puppeteer')
const express = require('express')
const path = require('path')

const app = express()
const port = 3000
let browser
let page

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'control-panel')))
app.use(express.json())

// Initialize browser
async function initBrowser() {
  browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  })
  return browser
}

// Start auto-clicking
app.post('/start', async (req, res) => {
  const { url, x, y, interval } = req.body

  try {
    if (!browser) {
      browser = await initBrowser()
    }

    page = await browser.newPage()

    // Set a common user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

    await page.goto(url)

    // Start clicking interval
    await page.evaluate((x, y, interval) => {
      window.clickInterval = setInterval(() => {
        const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          screenX: x,
          screenY: y,
          button: 0
        })
        document.elementFromPoint(x, y)?.dispatchEvent(clickEvent)
      }, interval)
    }, x, y, interval)

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Stop auto-clicking
app.post('/stop', async (req, res) => {
  try {
    if (page) {
      await page.evaluate(() => {
        if (window.clickInterval) {
          clearInterval(window.clickInterval)
          window.clickInterval = null
        }
      })
      await page.close()
    }
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Cleanup on exit
process.on('SIGINT', async () => {
  if (browser) {
    await browser.close()
  }
  process.exit()
})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
