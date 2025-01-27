const {join} = require('node:path')

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
  constructor () {
    this._mainWindow = UNDEFINED

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
        preload: join(__dirname, 'preload.js')
      }
    })

    this._createControlPanel()

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

    mainWindow.loadURL(url, {
      userAgent
    })

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

  _initIPCHandlers () {
    // Add IPC handlers
    ipcMain.on('start-capture-mode', () => {
      this._mainWindow.webContents.send('capture-mode-change', true)
    })

    ipcMain.on('stop-capture-mode', () => {
      this._mainWindow.webContents.send('capture-mode-change', false)
    })

    ipcMain.on('start-color-picker-mode', () => {
      this._mainWindow.webContents.send('color-picker-mode-change', true)
    })

    ipcMain.on('stop-color-picker-mode', () => {
      this._mainWindow.webContents.send('color-picker-mode-change', false)
    })

    ipcMain.on('capture-region', async (event, bounds) => {
      try {
        const result = await this._captureRegion(bounds)
        event.reply('capture-complete', result)
      } catch (error) {
        console.error('Screenshot failed:', error)
        event.reply('capture-error', error.message)
      }
    })

    ipcMain.on('get-color', async (event, position) => {
      try {
        const color = await this.getPixelColor(position.x, position.y)
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

    const fs = require('fs')
    const path = require('path')

    const timestamp = Date.now()
    const imagePath = path.join('games', 'letsgo', 'assets', `capture_${timestamp}.png`)
    const jsonPath = path.join('games', 'letsgo', 'assets', `capture_${timestamp}.json`)

    fs.writeFileSync(imagePath, buffer)
    fs.writeFileSync(jsonPath, JSON.stringify(bounds))

    return {imagePath, jsonPath}
  }

  async getPixelColor(x, y) {
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
