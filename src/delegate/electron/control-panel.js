const {ipcRenderer} = require('electron')

let isCapturing = false
let isPickingColor = false
let startPos = null

const captureBtn = document.getElementById('captureBtn')
const colorPickerBtn = document.getElementById('colorPickerBtn')
const colorDisplay = document.getElementById('colorDisplay')

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
  isPickingColor = !isPickingColor
  colorPickerBtn.textContent = isPickingColor ? 'Stop Picking' : 'Pick Color'
  colorDisplay.style.display = isPickingColor ? 'block' : 'none'

  if (isPickingColor) {
    ipcRenderer.send('start-color-picker-mode')
  } else {
    ipcRenderer.send('stop-color-picker-mode')
  }
})

ipcRenderer.on('color-update', (event, color) => {
  colorDisplay.textContent = `RGB: ${color.r}, ${color.g}, ${color.b}`
  colorDisplay.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`
  colorDisplay.style.color = (color.r + color.g + color.b) / 3 > 128 ? 'black' : 'white'
})
