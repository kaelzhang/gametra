const {ipcRenderer} = require('electron')

let isAutomating = false
let isCapturing = false
let isPickingPixel = false
let startPos = null

const startBtn = document.getElementById('startBtn')
const reloadBtn = document.getElementById('reloadBtn')
const setBotDeviceBtn = document.getElementById('setBotDeviceBtn')
const captureBtn = document.getElementById('captureBtn')
const pixelPickerBtn = document.getElementById('pixelPickerBtn')
const pixelDisplay = document.getElementById('pixelDisplay')

// New element selectors for the custom capture section
const captureXInput = document.getElementById('captureX')
const captureYInput = document.getElementById('captureY')
const captureWidthInput = document.getElementById('captureWidth')
const captureHeightInput = document.getElementById('captureHeight')
const customCaptureBtn = document.getElementById('customCaptureBtn')

const jumpDeltaXInput = document.getElementById('jumpDeltaX')
const jumpDeltaYInput = document.getElementById('jumpDeltaY')
const jumpBtn = document.getElementById('jumpBtn')


// Toggle scheduler
// ------------------------------------------------------------

const toggleScheduler = (enable = !isAutomating) => {
  isAutomating = enable
  startBtn.textContent = isAutomating ? 'Stop' : 'Start'

  if (isAutomating) {
    ipcRenderer.send('scheduler-start')
  } else {
    ipcRenderer.send('scheduler-stop')
  }
}

startBtn.addEventListener('click', () => {
  toggleScheduler()
})


// Reload
// ------------------------------------------------------------

reloadBtn.addEventListener('click', () => {
  ipcRenderer.send('reload')
})


// Toggle capture mode
// ------------------------------------------------------------

const toggleCaptureMode = (enable = !isCapturing) => {
  isCapturing = enable
  captureBtn.textContent = isCapturing ? 'Cancel Capture' : 'Capture Region'

  if (isCapturing) {
    ipcRenderer.send('start-capture-mode')
  } else {
    ipcRenderer.send('stop-capture-mode')
  }
}

captureBtn.addEventListener('click', () => {
  toggleCaptureMode()
})


// Toggle pixel picker mode
// ------------------------------------------------------------

const togglePixelPickerMode = (enable = !isPickingPixel) => {
  isPickingPixel = enable
  pixelPickerBtn.textContent = enable ? 'Stop Picking' : 'Pick Pixel'
  pixelDisplay.style.display = enable ? 'block' : 'none'

  if (enable) {
    ipcRenderer.send('start-pixel-picker-mode')
  } else {
    ipcRenderer.send('stop-pixel-picker-mode')
  }
}

pixelPickerBtn.addEventListener('click', () => {
  togglePixelPickerMode()
})


// Custom capture
// ------------------------------------------------------------

/* New custom capture listener */
customCaptureBtn.addEventListener('click', () => {
  const x = parseFloat(captureXInput.value)
  const y = parseFloat(captureYInput.value)
  const width = parseFloat(captureWidthInput.value)
  const height = parseFloat(captureHeightInput.value)

  if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
    alert('Please enter valid numbers in all fields')
    return
  }

  // Send the capture-region event with the custom bounds
  ipcRenderer.send('capture-region', { x, y, width, height })
})

ipcRenderer.on('pixel-update', (event, pixel) => {
  const {x, y, rgb} = pixel

  pixelDisplay.textContent = `${rgb.r}, ${rgb.g}, ${rgb.b} at (${x}, ${y})`
  pixelDisplay.style.backgroundColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  pixelDisplay.style.color = (rgb.r + rgb.g + rgb.b) / 3 > 128
    ? 'black'
    : 'white'
})

ipcRenderer.on('capture-complete', (event, data) => {
  toggleCaptureMode(false)
})

ipcRenderer.on('pixel-pick-complete', (event, data) => {
  togglePixelPickerMode(false)
})


// Jump
// ------------------------------------------------------------

jumpBtn.addEventListener('click', () => {
  ipcRenderer.send('custom-event', 'jump', {
    deltaX: jumpDeltaXInput.value,
    deltaY: jumpDeltaYInput.value
  })
})


setBotDeviceBtn.addEventListener('click', () => {
  ipcRenderer.send('custom-event', 'set-bot-device')
})

// Add event listeners to update the capture overlay when inputs change
function updateCaptureOverlay() {
  const x = captureXInput.value ? parseInt(captureXInput.value, 10) : undefined
  const y = captureYInput.value ? parseInt(captureYInput.value, 10) : undefined
  const width = captureWidthInput.value ? parseInt(captureWidthInput.value, 10) : undefined
  const height = captureHeightInput.value ? parseInt(captureHeightInput.value, 10) : undefined

  ipcRenderer.send('update-capture-overlay', { x, y, width, height })
}

// Create a simple throttle function since 'shared' is not available
function throttle(func, delay) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func.apply(this, args);
    }
  };
}

// Throttle the update function to avoid excessive updates
const throttledUpdate = throttle(updateCaptureOverlay, 100);

// Add input event listeners
captureXInput.addEventListener('input', throttledUpdate)
captureYInput.addEventListener('input', throttledUpdate)
captureWidthInput.addEventListener('input', throttledUpdate)
captureHeightInput.addEventListener('input', throttledUpdate)

// Initialize the overlay with current values when the page loads
document.addEventListener('DOMContentLoaded', () => {
  throttledUpdate()
})
