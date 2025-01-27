const {
  ipcRenderer
} = require('electron')

let isCapturing = false
let isPickingColor = false
let startPos = null
let selectionElement = null

// Create and inject selection overlay styles
const style = document.createElement('style')
style.textContent = `
  .region-select-overlay {
    position: fixed;
    border: 2px solid #0095ff;
    background: rgba(0, 149, 255, 0.1);
    pointer-events: none;
    z-index: 9999;
  }
`
document.head.appendChild(style)

// Helper function to create/update selection overlay
function updateSelectionOverlay(startX, startY, endX, endY) {
  if (!selectionElement) {
    selectionElement = document.createElement('div')
    selectionElement.className = 'region-select-overlay'
    document.body.appendChild(selectionElement)
  }

  const left = Math.min(startX, endX)
  const top = Math.min(startY, endY)
  const width = Math.abs(endX - startX)
  const height = Math.abs(endY - startY)

  selectionElement.style.left = `${left}px`
  selectionElement.style.top = `${top}px`
  selectionElement.style.width = `${width}px`
  selectionElement.style.height = `${height}px`
}

// Remove selection overlay
function removeSelectionOverlay() {
  if (selectionElement) {
    selectionElement.remove()
    selectionElement = null
  }
}

window.addEventListener('mousedown', e => {
  if (isCapturing) {
    startPos = { x: e.clientX, y: e.clientY }
  }
})

window.addEventListener('mousemove', e => {
  if (isCapturing && startPos) {
    updateSelectionOverlay(startPos.x, startPos.y, e.clientX, e.clientY)
  }
  if (isPickingColor) {
    ipcRenderer.send('get-color', { x: e.clientX, y: e.clientY })
  }
})

window.addEventListener('mouseup', e => {
  if (isCapturing && startPos) {
    const bounds = {
      x: Math.min(startPos.x, e.clientX),
      y: Math.min(startPos.y, e.clientY),
      width: Math.abs(e.clientX - startPos.x),
      height: Math.abs(e.clientY - startPos.y)
    }

    ipcRenderer.send('capture-region', bounds)
    removeSelectionOverlay()
    startPos = null
  }
})


// Handle mode change events from main process
ipcRenderer.on('capture-mode-change', (event, enabled) => {
  isCapturing = enabled
  if (!enabled) {
    removeSelectionOverlay()
    startPos = null
  }
  // Change cursor to crosshair when in capture mode
  document.body.style.cursor = enabled ? 'crosshair' : 'default'
})

ipcRenderer.on('color-picker-mode-change', (event, enabled) => {
  isPickingColor = enabled
  // Change cursor to crosshair when in color picker mode
  document.body.style.cursor = enabled ? 'crosshair' : 'default'
})
