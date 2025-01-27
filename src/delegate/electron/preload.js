const { ipcRenderer } = require('electron')

let isCapturing = false
let isPickingColor = false
let startPos = null

window.addEventListener('mousedown', (e) => {
  if (isCapturing) {
    startPos = { x: e.clientX, y: e.clientY }
  }
})

window.addEventListener('mouseup', (e) => {
  if (isCapturing && startPos) {
    const bounds = {
      x: Math.min(startPos.x, e.clientX),
      y: Math.min(startPos.y, e.clientY),
      width: Math.abs(e.clientX - startPos.x),
      height: Math.abs(e.clientY - startPos.y)
    }

    ipcRenderer.send('capture-region', bounds)
    startPos = null
  }
})

window.addEventListener('mousemove', (e) => {
  if (isPickingColor) {
    ipcRenderer.send('get-color', { x: e.clientX, y: e.clientY })
  }
})

ipcRenderer.on('capture-mode-change', (event, enabled) => {
  isCapturing = enabled
})

ipcRenderer.on('color-picker-mode-change', (event, enabled) => {
  isPickingColor = enabled
})
