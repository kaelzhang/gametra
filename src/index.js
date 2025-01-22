const {
  app,
  BrowserWindow,
  ipcMain
} = require('electron')
const path = require('node:path')

let mainWindow

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
      // Set user agent to mimic Chrome browser
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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

  const filepath = path.join(__dirname, 'index.html')
  // Load initial URL
  mainWindow.loadURL(`file://${filepath}`)

  return mainWindow
}

// Handle auto-click configuration
ipcMain.on('start-auto-click', (event, config) => {
  mainWindow.webContents.executeJavaScript(`
    startAutoClick(${JSON.stringify(config)});
  `)
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
