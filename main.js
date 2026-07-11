const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
  // 创建浏览器窗口
  const win = new BrowserWindow({
    width: 800,
    height: 900,
    minWidth: 400,
    minHeight: 500,
    icon: path.join(__dirname, 'icon.png'), // 这里如果没 png 暂时用默认
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // 隐藏顶部默认菜单栏
  win.setMenuBarVisibility(false);

  // 加载 index.html
  win.loadFile('index.html');
}

// 当 Electron 完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // 在 macOS 上，当点击 dock 图标并且没有其他窗口打开时，
    // 通常在应用程序中重新创建一个窗口。
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 除了 macOS 外，当所有窗口都被关闭的时候退出程序
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});