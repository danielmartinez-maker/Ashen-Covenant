const { app, BrowserWindow, shell, protocol } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

protocol.registerSchemesAsPrivileged([{ scheme: 'ashen', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);

if (process.platform === 'win32') app.setAppUserModelId('com.ashencovenant.game');

const DIST_ROOT = path.resolve(__dirname, '..', 'dist');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.ico': 'image/x-icon' };

const registerGameProtocol = () => protocol.handle('ashen', async (request) => {
  try {
    const url = new URL(request.url);
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const target = path.resolve(DIST_ROOT, relative);
    if (target !== DIST_ROOT && !target.startsWith(`${DIST_ROOT}${path.sep}`)) return new Response('Forbidden', { status: 403 });
    const body = await fs.readFile(target);
    return new Response(body, { status: 200, headers: { 'content-type': MIME[path.extname(target).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
});

const createWindow = () => {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#090d12',
    title: 'Ashen Covenant',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });
  window.loadURL('ashen://game/index.html');
  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const target = new URL(url);
      if (target.protocol === 'https:' || target.protocol === 'mailto:') shell.openExternal(url);
    } catch {
      // Keep malformed or local window-opening attempts inside the sandboxed game window.
    }
    return { action: 'deny' };
  });
};

app.whenReady().then(async () => {
  await registerGameProtocol();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
