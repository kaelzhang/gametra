const {join} = require('node:path')

const {
  BrowserWindow,
  app
} = require('electron')

const {
  UNDEFINED,
  NOOP
} = require('../const')


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
      width: 1000,
      height: 600,
      resizable: false,
      webPreferences: {
        preload: join(__dirname, 'preload.js')
      }
    })

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
}


module.exports = {
  ElectronDelegate
}
