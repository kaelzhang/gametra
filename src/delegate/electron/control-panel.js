const {ipcRenderer} = require('electron')

let isCapturing = false
let isPickingPixel = false
let startPos = null

const captureBtn = document.getElementById('captureBtn')
const pixelPickerBtn = document.getElementById('pixelPickerBtn')
const pixelDisplay = document.getElementById('pixelDisplay')

captureBtn.addEventListener('click', () => {
  isCapturing = !isCapturing
  captureBtn.textContent = isCapturing ? 'Cancel Capture' : 'Capture Region'

  if (isCapturing) {
    ipcRenderer.send('start-capture-mode')
  } else {
    ipcRenderer.send('stop-capture-mode')
  }
})

colorPickerBtn.addEventListener('click', () => {
  isPickingPixel = !isPickingPixel
  pixelPickerBtn.textContent = isPickingPixel ? 'Stop Picking' : 'Pick Pixel'
  pixelDisplay.style.display = isPickingPixel ? 'block' : 'none'

  if (isPickingPixel) {
    ipcRenderer.send('start-pixel-picker-mode')
  } else {
    ipcRenderer.send('stop-pixel-picker-mode')
  }
})

ipcRenderer.on('pixel-update', (event, pixel) => {
  const {x, y, rgb} = pixel

  pixelDisplay.textContent = `RGB: ${rgb.r}, ${rgb.g}, ${rgb.b}`
  pixelDisplay.style.backgroundColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  pixelDisplay.style.color = (rgb.r + rgb.g + rgb.b) / 3 > 128
    ? 'black'
    : 'white'
})
