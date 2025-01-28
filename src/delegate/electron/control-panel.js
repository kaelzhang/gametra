const {ipcRenderer} = require('electron')

let isCapturing = false
let isPickingPixel = false
let startPos = null

const captureBtn = document.getElementById('captureBtn')
const pixelPickerBtn = document.getElementById('pixelPickerBtn')
const pixelDisplay = document.getElementById('pixelDisplay')


const toggleCaptureMode = (enable = !isCapturing) => {
  isCapturing = enable
  captureBtn.textContent = isCapturing ? 'Cancel Capture' : 'Capture Region'

  console.log('isCapturing', isCapturing)

  if (isCapturing) {
    ipcRenderer.send('start-capture-mode')
  } else {
    ipcRenderer.send('stop-capture-mode')
  }
}

captureBtn.addEventListener('click', () => {
  toggleCaptureMode()
})


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


ipcRenderer.on('pixel-update', (event, pixel) => {
  const {x, y, rgb} = pixel

  pixelDisplay.textContent = `${rgb.r}, ${rgb.g}, ${rgb.b} at (${x}, ${y})`
  pixelDisplay.style.backgroundColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  pixelDisplay.style.color = (rgb.r + rgb.g + rgb.b) / 3 > 128
    ? 'black'
    : 'white'
})

ipcRenderer.on('capture-complete', (event, data) => {
  console.log('received capture-complete')
  toggleCaptureMode(false)
})

ipcRenderer.on('pixel-pick-complete', (event, data) => {
  togglePixelPickerMode(false)
})
