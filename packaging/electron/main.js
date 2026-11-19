const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

/* The game is a self-contained static bundle; no server, no network. */
function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0d1512',
    title: 'Harvest & Herald: The Great Commission',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      partition: 'persist:harvest',
    },
  });

  win.loadFile(path.join(__dirname, 'www', 'index.html'));

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Keep the packaged app on its own files; anything remote belongs in the
  // user's browser, where the release downloads actually work.
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  return win;
}

const template = [
  {
    label: 'Game',
    submenu: [
      { role: 'reload' },
      { role: 'togglefullscreen' },
      { type: 'separator' },
      { role: 'quit' },
    ],
  },
  {
    label: 'View',
    submenu: [
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
    ],
  },
];

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
