const {
  ipcRenderer
} = require('electron')

const UNDEFINED = void 0


let isCapturing = false
let isPickingPixel = false
let startPos

class Element {
  #element
  #creator

  constructor(creator) {
    this.#creator = creator
  }

  show () {
    if (!this.#element) {
      const creator = this.#creator
      this.#element = creator()
      document.body.appendChild(this.#element)
    }
  }

  hide () {
    if (this.#element) {
      this.#element.remove()
      this.#element = UNDEFINED
    }
  }

  perform (fn) {
    this.show()
    fn(this.#element)
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

// Add a new independent overlay for the capture inputs
const captureOverlay = new Element(() => {
  const element = document.createElement('div')
  element.className = 'gametra-capture-overlay'
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

  .gametra-capture-overlay {
    position: fixed;
    border: 2px dashed #ff5500;
    pointer-events: none;
    z-index: 9997;
    background-color: rgba(255, 85, 0, 0.1);
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
    element.style.left = `${left - 2}px`
    element.style.top = `${top - 2}px`
    element.style.width = `${width}px`
    element.style.height = `${height}px`
  })
}

// Add a function to update the capture overlay based on input values
function updateCaptureOverlay(x, y, width, height) {
  if (x === undefined || y === undefined) {
    captureOverlay.hide()
    return
  }

  // Default to 100px if width or height is not provided
  const finalWidth = width || 100
  const finalHeight = height || 100

  captureOverlay.perform(element => {
    element.style.left = `${x - 2}px`
    element.style.top = `${y - 2}px`
    element.style.width = `${finalWidth}px`
    element.style.height = `${finalHeight}px`
  })
}


window.addEventListener('click', e => {
  if (!isCapturing && !isPickingPixel) {
    return
  }

  if (isPickingPixel) {
    ipcRenderer.send('get-pixel', {
      x: e.clientX,
      y: e.clientY,
      save: true
    })
    togglePixelPickerMode(false)
    return
  }

  // isCapturing is true

  if (startPos) {
    const bounds = {
      // The current mouse position might be less than the start position
      // so we need to use the minimum of the two
      x: Math.min(startPos.x, e.clientX),
      y: Math.min(startPos.y, e.clientY),
      width: Math.abs(e.clientX - startPos.x),
      height: Math.abs(e.clientY - startPos.y)
    }

    ipcRenderer.send('capture-region', bounds)
    toggleCaptureMode(false)
    return
  }

  startPos = {
    x: e.clientX,
    y: e.clientY
  }
})

window.addEventListener('mousemove', e => {
  if (isCapturing && startPos) {
    updateSelectionOverlay(startPos.x, startPos.y, e.clientX, e.clientY)
  }

  if (isPickingPixel) {
    ipcRenderer.send('get-pixel', { x: e.clientX, y: e.clientY })
  }
})


const toggleCaptureMode = enable => {
  isCapturing = enable
  if (!enable) {
    selectionOverlay.hide()
    selectionMask.hide()
    startPos = UNDEFINED
  } else {
    selectionMask.show()
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
  if (enable) {
    selectionMask.show()
  } else {
    selectionMask.hide()
  }

  // Change cursor to crosshair when in color picker mode
  document.body.style.cursor = enable ? 'crosshair' : 'default'
}

ipcRenderer.on('pixel-picker-mode-change', (event, enable) => {
  togglePixelPickerMode(enable)
})

// Add a listener for capture input changes from the control panel
ipcRenderer.on('update-capture-overlay', (event, { x, y, width, height }) => {
  updateCaptureOverlay(x, y, width, height)
})

