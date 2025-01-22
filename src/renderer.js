const {
  ipcRenderer
} = require('electron')

let clickInterval

const webview = document.getElementById('webview')

// Configure webview
webview.addEventListener('dom-ready', () => {
  // Inject click simulation script
  webview.executeJavaScript(`
    function startAutoClick(config) {
      const simulateClick = (x, y) => {
        // Create mouse events for mousedown and mouseup to better simulate real click
        const mouseDownEvent = new MouseEvent('mousedown', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          screenX: x,
          screenY: y,
          button: 0,  // Left mouse button
          buttons: 1
        });

        const mouseUpEvent = new MouseEvent('mouseup', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          screenX: x,
          screenY: y,
          button: 0,  // Left mouse button
          buttons: 0
        });

        const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          screenX: x,
          screenY: y,
          button: 0,  // Left mouse button
          buttons: 0
        });

        // Dispatch events directly to the document
        document.dispatchEvent(mouseDownEvent);
        document.dispatchEvent(mouseUpEvent);
        document.dispatchEvent(clickEvent);
      }

      if (window.clickInterval) {
        clearInterval(window.clickInterval);
      }

      window.clickInterval = setInterval(() => {
        simulateClick(config.x, config.y);
      }, config.interval);
    }
  `)
})

function startClicking () {
  const config = {
    url: document.getElementById('urlInput').value,
    interval: parseInt(document.getElementById('intervalInput').value, 10),
    x: parseInt(document.getElementById('xCoord').value, 10),
    y: parseInt(document.getElementById('yCoord').value, 10)
  }

  // Load target URL
  webview.loadURL(config.url)

  // Start auto-clicking
  ipcRenderer.send('start-auto-click', config)
}

function stopClicking () {
  webview.executeJavaScript(`
    if (window.clickInterval) {
      clearInterval(window.clickInterval);
      window.clickInterval = null;
    }
  `)
}

// Export functions to make them available to HTML
window.startClicking = startClicking
window.stopClicking = stopClicking
