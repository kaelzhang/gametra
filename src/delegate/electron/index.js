const {join} = require('node:path')
const fs = require('node:fs/promises')
const {setTimeout} = require('node:timers/promises')

const {
  log,
  Viewport,
  encodeNativeBMPImage
} = require('../../util')

const {
  BrowserWindow,
  app,
  ipcMain
} = require('electron')

const {
  UNDEFINED,
  NOOP,
  BUTTON_LEFT
} = require('../../const')


class ElectronDelegate {
  #mainWindow
  #controlPanel
  #debug
  #downloadPath
  #readyPromise
  #resolveReady
  #batchId
  #x
  #y

  constructor ({
    debug = false,
    downloadPath
  } = {}) {
    this.#debug = debug

    if (typeof downloadPath !== 'string') {
      throw new TypeError('downloadPath must be specified')
    }

    this.#downloadPath = downloadPath

    this.#init()

    app.whenReady().then(() => {
      this.#resolveReady()
      this.#resolveReady = NOOP
    })

    app.on('activate', () => {
      this.#resolveReady()
    })

    app.on('window-all-closed', function () {
      if (process.platform !== 'darwin') app.quit()
    })
  }

  #init () {
    const {promise, resolve} = Promise.withResolvers()
    this.#readyPromise = promise
    this.#resolveReady = resolve
  }

  async #increaseBatchId () {
    const filepath = join(this.#downloadPath, '.batch.json')

    let batchId

    try {
      const content = await fs.readFile(filepath, 'utf-8')
      batchId = JSON.parse(content.toString()).batchId || 0
    } catch (error) {
      batchId = 0
    }

    batchId ++

    await fs.writeFile(filepath, JSON.stringify({batchId}))

    this.#batchId = batchId
  }

  async launch ({
    url,
    width,
    height,
    userAgent
  }) {
    await this.#readyPromise

    await this.#createWindow({
      url,
      width,
      height,
      userAgent
    })
  }

  async #createWindow ({
    url,
    width,
    height,
    userAgent
  }) {
    const mainWindow = this.#mainWindow = new BrowserWindow({
      width,
      height,
      resizable: false,
      webPreferences: {
        preload: join(__dirname, 'main-window.js'),
        contextIsolation: true,
        // TODO:
        // We need this to make `require()` work in the preload script,
        // However, it's a security risk.
        // We should use a bundler to bundle the preload script instead of
        //   relying on `require()`.
        nodeIntegration: true
      }
    })

    if (this.#debug) {
      // open devtools in exeternal window
      mainWindow.webContents.openDevTools({
        mode: 'undocked'
      })
    }

    this.#createControlPanel()
    this.#initIPCHandlers()

    const {promise, resolve} = Promise.withResolvers()

    const {webContents} = mainWindow

    webContents.setUserAgent(userAgent)

    webContents.on('did-finish-load', () => {
      resolve()

      // Focus the window to make the click event work
      webContents.focus()
    })

    await mainWindow.loadURL(url)

    return promise
  }

  #createControlPanel () {
    const mainWindow = this.#mainWindow
    const bounds = mainWindow.getBounds()

    const controlPanel = this.#controlPanel = new BrowserWindow({
      width: 200,
      height: 400,
      x: bounds.x + bounds.width,
      y: bounds.y,
      resizable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    })

    controlPanel.loadFile(join(__dirname, 'control-panel.html'))

    if (this.#debug) {
      // open devtools in exeternal window
      controlPanel.webContents.openDevTools({
        mode: 'undocked'
      })
    }
  }

  // Mouse Events
  // ------------------------------------------------------------
  // A delegate should implement the very atomic mouse events
  // - [x] mouseMove
  // - [x] mouseDown
  // - [x] mouseUp
  // - [ ] click: could be a combination of move and down,
  //   so won't be implemented here
  // Ref:
  // - https://pptr.dev/api/puppeteer.mouse.down
  // - https://www.electronjs.org/docs/latest/api/web-contents#contentssendinputeventinputevent

  async mouseMove (x, y) {
    this.#mainWindow.webContents.sendInputEvent({
      type: 'mouseMove',
      x,
      y
    })

    this.#x = x
    this.#y = y
  }

  async mouseDown ({
    button = BUTTON_LEFT,
  } = {}) {
    this.#mainWindow.webContents.sendInputEvent({
      type: 'mouseDown',
      x: this.#x,
      y: this.#y,
      button
    })
  }

  async mouseUp ({
    button = BUTTON_LEFT
  } = {}) {
    this.#mainWindow.webContents.sendInputEvent({
      type: 'mouseUp',
      x: this.#x,
      y: this.#y,
      button
    })
  }

  async mouseWheel ({
    deltaX,
    deltaY
  } = {}) {
    const event = {
      type: 'mouseWheel'
    }

    if (deltaX) {
      event.deltaX = deltaX
    }

    if (deltaY) {
      event.deltaY = deltaY
    }

    this.#mainWindow.webContents.sendInputEvent(event)
  }

  // Keyboard Events
  // ------------------------------------------------------------
  // A delegate should implement the very atomic keyboard events
  // - [x] keyDown
  // - [x] keyUp
  // - [ ] keyPress: could be a combination of keyDown and keyUp,
  //   so won't be implemented here

  async keyDown (keyCode) {
    this.#mainWindow.webContents.sendInputEvent({
      type: 'keyDown',
      keyCode
    })
  }

  async keyUp (keyCode) {
    this.#mainWindow.webContents.sendInputEvent({
      type: 'keyUp',
      keyCode
    })
  }

  // Add IPC handlers
  // ------------------------------------------------------------

  #initIPCHandlers () {
    // Sent from the control panel
    // ------------------------------------------------------------
    ipcMain.on('start-capture-mode', () => {
      log('received "start-capture-mode" from control panel')

      const {webContents} = this.#mainWindow
      webContents.focus()
      webContents.send('pixel-picker-mode-change', false)
      webContents.send('capture-mode-change', true)
    })

    ipcMain.on('stop-capture-mode', () => {
      log('received "stop-capture-mode" from control panel')
      this.#mainWindow.webContents.send('capture-mode-change', false)
    })

    ipcMain.on('start-pixel-picker-mode', () => {
      log('received "start-pixel-picker-mode" from control panel')

      const {webContents} = this.#mainWindow
      webContents.focus()
      webContents.send('capture-mode-change', false)
      webContents.send('pixel-picker-mode-change', true)
    })

    ipcMain.on('stop-pixel-picker-mode', () => {
      log('received "stop-pixel-picker-mode" from control panel')
      this.#mainWindow.webContents.send('pixel-picker-mode-change', false)
    })

    // Sent from the main window
    // ------------------------------------------------------------
    ipcMain.on('capture-region', async (event, bounds) => {
      log('received "capture-region" from main window')
      try {
        const {x, y, width, height} = bounds
        await this.#captureRegion(
          new Viewport(x, y, width, height)
        )
      } catch (error) {
        log('Capture error', error.message)
      }
    })

    ipcMain.on('get-pixel', async (event, {x, y, save = false}) => {
      if (save) {
        log('received "get-pixel" from main window')
      }

      try {
        await this.#getPixel(x, y, save)
      } catch (error) {
        log('Color picking failed:', error)
      }
    })
  }

  // Returns a Jimp image
  async screenshot (viewport) {
    const mainWindow = this.#mainWindow

    if (!viewport) {
      viewport = mainWindow.getBounds()
    }

    const image = await mainWindow.webContents.capturePage(viewport)
    return encodeNativeBMPImage(image)
  }

  async #captureRegion(viewport) {
    const image = await this.screenshot(viewport)
    const bounds = viewport.object()

    log('writing capture image to', this.#downloadPath, bounds)

    await this.#increaseBatchId()

    const jsonPath = await this.#saveJson(bounds)
    const imagePath = this.#getCaptureFileName('bmp')

    await image.write(imagePath)

    const result = {
      imagePath,
      jsonPath,
      viewport: bounds
    }

    this.#controlPanel.webContents.send('capture-complete', result)

    return result
  }

  #getCaptureFileName (ext, namePrefix = 'capture') {
    return join(this.#downloadPath, `${namePrefix}_${this.#batchId}.${ext}`)
  }

  // Save a buffer or a JSON object to a file
  async #saveJson (data, namePrefix = 'capture') {
    const filepath = this.#getCaptureFileName('json', namePrefix)
    await fs.writeFile(filepath, JSON.stringify(data))

    return filepath
  }

  async #getPixel(x, y, save) {
    const {
      bitmap: {
        data
      }
    } = await this.screenshot(new Viewport(x, y, 1, 1))

    // The buffer of Jimp is in RGBA format
    const rgb = {
      r: data[0],
      g: data[1],
      b: data[2]
    }

    const pixel = {
      x,
      y,
      rgb
    }

    const {webContents} = this.#controlPanel

    webContents.send('pixel-update', pixel)

    if (save) {
      await this.#increaseBatchId()

      await this.#saveJson(pixel, 'pixel')
      webContents.send('pixel-pick-complete', pixel)
    }

    return pixel
  }
}


module.exports = {
  ElectronDelegate
}
