const {
  ipcRenderer
} = require('electron')

const {
  UNDEFINED
} = require('../../const')


let isCapturing = false
let isPickingPixel = false
let startPos = UNDEFINED

class Element {
  constructor(creator) {
    this._element = UNDEFINED
    this._create = creator
  }

  show () {
    if (!this._element) {
      const creator = this._create
      this._element = creator()
      document.body.appendChild(this._element)
    }
  }

  hide () {
    if (this._element) {
      this._element.remove()
      this._element = UNDEFINED
    }
  }

  perform (fn) {
    this.show()
    fn(this._element)
  }
}


const selectionOverlay = new Element(() => {
  const element = document.createElement('div')
  element.className = 'gametra-region-select-overlay'
  return element
})

const selectionMask = new Element(() => {
  const element = document.createElement('div')
  element.className = 'gametra-region-select-mask'
  return element
})

// Create and inject selection overlay styles
const style = document.createElement('style')
const STYLE_ID = 'gametra-region-select-overlay-style'
style.id = STYLE_ID
style.textContent = `
  .gametra-region-select-overlay {
    position: fixed;
    border: 2px solid #0095ff;
    background: rgba(0, 149, 255, 0.1);
    pointer-events: none;
    z-index: 9999;
  }

  .gametra-region-select-mask {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9998;
  }
`

// Only inject the style when document is ready
document.addEventListener('DOMContentLoaded', () => {
  document.head.appendChild(style)
})

// Helper function to create/update selection overlay
function updateSelectionOverlay(startX, startY, endX, endY) {
  const left = Math.min(startX, endX)
  const top = Math.min(startY, endY)
  const width = Math.abs(endX - startX)
  const height = Math.abs(endY - startY)

  selectionOverlay.perform(element => {
    element.style.left = `${left}px`
    element.style.top = `${top}px`
    element.style.width = `${width}px`
    element.style.height = `${height}px`
  })
}

// Remove selection overlay
function removeSelectionOverlay() {
  selectionOverlay.hide()
}

window.addEventListener('mousedown', e => {
  if (isCapturing) {
    startPos = { x: e.clientX, y: e.clientY }
  }
})

window.addEventListener('mousemove', e => {
  if (isCapturing && startPos) {
    updateSelectionOverlay(startPos.x, startPos.y, e.clientX, e.clientY)
    selectionMask.show()
  }
  if (isPickingPixel) {
    ipcRenderer.send('get-pixel', { x: e.clientX, y: e.clientY })
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
    toggleCaptureMode(false)
  }

  if (isPickingPixel) {
    ipcRenderer.send('get-pixel', {
      x: e.clientX,
      y: e.clientY,
      save: true
    })
    togglePixelPickerMode(false)
  }
})


const toggleCaptureMode = enable => {
  isCapturing = enable
  if (!enable) {
    selectionOverlay.hide()
    selectionMask.hide()
    startPos = UNDEFINED
  }

  // Change cursor to crosshair when in capture mode
  document.body.style.cursor = enable ? 'crosshair' : 'default'
}

// Handle mode change events from main process
ipcRenderer.on('capture-mode-change', (event, enable) => {
  toggleCaptureMode(enable)
})


const togglePixelPickerMode = enable => {
  isPickingPixel = enable
  // Change cursor to crosshair when in color picker mode
  document.body.style.cursor = enable ? 'crosshair' : 'default'
}

ipcRenderer.on('pixel-picker-mode-change', (event, enable) => {
  togglePixelPickerMode(enable)
})

