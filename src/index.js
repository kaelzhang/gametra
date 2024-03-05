const {
  app,
  BrowserWindow,
  // Menu
} = require('electron')
const path = require('node:path')

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // const url = 'https://gamer.qq.com/v2/cloudgame/game/96897?ichannel=pcgames0Fpcgames1'
  const url = 'https://www.google.com'

  // and load the index.html of the app.
  mainWindow.loadURL(url, {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  })

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  return mainWindow
}

function createControlWindow () {
  const controlWindow = new BrowserWindow({
    width: 400,
    height: 300,
    // webPreferences: {
    //   preload: path.join(__dirname, 'preload.js')
    // }
  })

  controlWindow.loadFile('control.html')

  return controlWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // createWindow()
  createControlWindow()

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    // if (BrowserWindow.getAllWindows().length === 0) {
    //   createWindow()
    //   createControlWindow()
    // }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
