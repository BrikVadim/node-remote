const {app, BrowserWindow, Tray, Menu} = require('electron')

let mainWindow = null
let tray = null

function createWindow () {
  mainWindow = new BrowserWindow({ 
    show: false
 })

  mainWindow.loadFile('index.html')

  mainWindow.on('closed', function () {
    mainWindow = null
  })

  mainWindow.setSkipTaskbar(true);

  tray = new Tray(__dirname + '/icon.ico');
  tray.setToolTip('ITR-Remote');
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})