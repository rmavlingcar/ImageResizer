const path = require("path");
const os = require("os");
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron')
const imagemin = require('imagemin')
const imagemin_mozjpeg = require('imagemin-mozjpeg')
const imagemin_pngquant = require('imagemin-pngquant')
const slash = require('slash')
const log = require('electron-log')

//set ENV variables
process.env.NODE_ENV = 'PROD'
const isDev = process.env.NODE_ENV !== 'PROD' ? true : false

const isMac = process.platform == 'darwin' ? true : false

let mainWindow
let aboutWindow

function createMainWindow() {
    mainWindow = new BrowserWindow({
        title: isDev ? 'ImageResizer (Development)' : 'ImageResizer',
        width: 800,
        height: 600,
        center: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    mainWindow.loadFile(`${__dirname}/app/index.html`)
}

function createAboutWindow() {
    aboutWindow = new BrowserWindow({
        title: 'About',
        width: 300,
        height: 300,
        resizable: false
    })

    aboutWindow.loadFile(`${__dirname}/app/about.html`)
}

const menu = [
    ...(isMac ? [{
        label: app.name,
        submenu: [{
            label: 'About',
            click: createAboutWindow
        }]
    }] : []),
    {
        role: 'fileMenu'
    },
    ...(!isMac ? [{
        label: 'Help',
        submenu: [{
            label: 'About',
            click: createAboutWindow
        }]
    }] : []),
    ...(isDev ? [
        {
            label: 'Developer Tools',
            submenu: [
                { role: 'reload' },
                { role: 'forcereload' },
                { type: 'separator' },
                { role: 'toggledevtools' }
            ]
        }
    ] : [])
]

ipcMain.on('image:minified', (e, options) => {
    options.dest = path.join(os.homedir(), "ImageResizer");
    shrinkImage(options)
})

async function shrinkImage({ imgPath, quality, dest }) {
    try {
        const pngQuality = quality / 100

        const files = await imagemin([slash(imgPath)], {
            destination: dest,
            plugins: [
                imagemin_mozjpeg({ quality }),
                imagemin_pngquant({
                    quality: [pngQuality, pngQuality]
                })
            ]
        })

        //console.log(files)
        log.info(files)


        shell.openPath(dest)

        mainWindow.webContents.send('image:done')
    } catch (err) {
        //console.log(err)
        log.error(err)
    }
}

app.on('ready', () => {
    createMainWindow()

    const mainMenu = Menu.buildFromTemplate(menu)
    Menu.setApplicationMenu(mainMenu)

    mainWindow.on('closed', () => mainWindow = null)
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
})


