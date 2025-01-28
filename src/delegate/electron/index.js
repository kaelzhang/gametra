const {join} = require('node:path')
const fs = require('node:fs/promises')
const {
  log
} = require('../../util')

const {
  BrowserWindow,
  app,
  ipcMain
} = require('electron')

const {
  UNDEFINED,
  NOOP
} = require('../../const')

const DOWNLOAD_PATH = join(__dirname, 'downloads')


class ElectronDelegate {
  constructor ({
    debug = false
  } = {}) {
    this._mainWindow = UNDEFINED
    this._debug = debug

    this._init()

    app.whenReady().then(() => {
      this._resolveReady()
      this._resolveReady = NOOP
    })

    app.on('activate', () => {
      this._resolveReady()
    })

    app.on('window-all-closed', function () {
      if (process.platform !== 'darwin') app.quit()
    })
  }

  _init () {
    this._readyPromise = new Promise((resolve) => {
      this._resolveReady = resolve
    })
  }

  async launch ({
    url,
    width,
    height,
    userAgent
  }) {
    await this._readyPromise

    await this._createWindow({
      url,
      width,
      height,
      userAgent
    })
  }

  async _createWindow ({
    url,
    width,
    height,
    userAgent
  }) {
    const mainWindow = this._mainWindow = new BrowserWindow({
      width,
      height,
      resizable: false,
      webPreferences: {
        preload: join(__dirname, 'preload.js'),
        contextIsolation: true,
        // TODO:
        // We need this to make `require()` work in the preload script,
        // However, it's a security risk.
        // We should use a bundler to bundle the preload script instead of
        //   relying on `require()`.
        nodeIntegration: true
      }
    })

    if (this._debug) {
      // open devtools in exeternal window
      mainWindow.webContents.openDevTools({
        mode: 'undocked'
      })
    }

    this._createControlPanel()
    this._initIPCHandlers()

    let resolve

    const promise = new Promise((_resolve) => {
      resolve = _resolve
    })

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

  _createControlPanel () {
    const mainWindow = this._mainWindow
    const bounds = mainWindow.getBounds()

    this._controlPanel = new BrowserWindow({
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

    this._controlPanel.loadFile(join(__dirname, 'control-panel.html'))
  }

  // Add IPC handlers
  _initIPCHandlers () {
    // Sent from the control panel
    // ------------------------------------------------------------
    ipcMain.on('start-capture-mode', () => {
      log('received "start-capture-mode" from control panel')
      this._mainWindow.webContents.send('capture-mode-change', true)
    })

    ipcMain.on('stop-capture-mode', () => {
      log('received "stop-capture-mode" from control panel')
      this._mainWindow.webContents.send('capture-mode-change', false)
    })

    ipcMain.on('start-color-picker-mode', () => {
      log('received "start-color-picker-mode" from control panel')
      this._mainWindow.webContents.send('color-picker-mode-change', true)
    })

    ipcMain.on('stop-color-picker-mode', () => {
      log('received "stop-color-picker-mode" from control panel')
      this._mainWindow.webContents.send('color-picker-mode-change', false)
    })

    // Sent from the main window
    // ------------------------------------------------------------
    ipcMain.on('capture-region', async (event, bounds) => {
      log('received "capture-region" from main window')
      try {
        const result = await this._captureRegion(bounds)
        event.reply('capture-complete', result)
      } catch (error) {
        event.reply('capture-error', error.message)
      }
    })

    ipcMain.on('get-color', async (event, position) => {
      log('received "get-color" from main window')
      try {
        const color = await this._getPixelColor(position.x, position.y)
        this._controlPanel.webContents.send('color-update', color)
      } catch (error) {
        console.error('Color picking failed:', error)
      }
    })
  }

  async click (x, y) {
    const {webContents} = this._mainWindow

    webContents.sendInputEvent({
      type: 'mouseDown',
      x,
      y
    })

    webContents.sendInputEvent({
      type: 'mouseUp',
      x,
      y
    })
  }

  async screenshot (x, y, width, height) {
    const {webContents} = this._mainWindow

    return webContents.capturePage({
      x,
      y,
      width,
      height
    })
  }

  async _captureRegion(bounds) {
    const {x, y, width, height} = bounds
    const image = await this.screenshot(x, y, width, height)
    const buffer = image.toPNG()

    const timestamp = Date.now()
    const imagePath = join(DOWNLOAD_PATH, `capture_${timestamp}.png`)
    const jsonPath = join(DOWNLOAD_PATH, `capture_${timestamp}.json`)

    log('writing capture image to', DOWNLOAD_PATH, x, y, width, height)

    await fs.writeFile(imagePath, buffer)
    await fs.writeFile(jsonPath, JSON.stringify(bounds))

    return {imagePath, jsonPath}
  }

  async _getPixelColor(x, y) {
    const image = await this.screenshot(x, y, 1, 1)
    const buffer = image.toBitmap()
    return {
      r: buffer[2],
      g: buffer[1],
      b: buffer[0]
    }
  }
}


module.exports = {
  ElectronDelegate
}
