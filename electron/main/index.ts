import { app, BrowserWindow, Menu, shell, ipcMain, dialog, clipboard, IpcMainInvokeEvent } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import crypto from 'crypto';
import fs from 'node:fs'
import keytar from 'keytar';

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

const dataPath = path.join(app.getPath('exe'), '..', 'data');


app.setPath('userData', path.join(dataPath, 'userData'));
app.setPath('sessionData', path.join(dataPath, 'sessionData'));
app.setPath('logs', path.join(dataPath, 'logs'));

app.setPath('temp', path.join(dataPath, 'temp'));
app.setPath('crashDumps', path.join(dataPath, 'crashDumps'));

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'Lockity',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.png'),
    'minHeight': 400,
    'minWidth': 325,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  Menu.setApplicationMenu(null);

  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
  // win.webContents.on('will-navigate', (event, url) => { }) #344
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  win = null;
  vaultFilePath = '';
  keytar.deletePassword('lockiti', 'decryption-key');
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
});

let vaultFilePath = '';
ipcMain.handle('copy-to-clipboard', async (event, string: string) => {
  clipboard.writeText(string);
  dialog.showMessageBox(win, {
    message: 'Coppied to clipboard. It will be cleared in 15 seconds!',
    type: 'warning'
  });

  setTimeout(() => {
    clipboard.clear();
    console.log('Clipboard is cleared!')
  }, 15000);
});


ipcMain.handle('vault-open', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        {
          name: 'Lockity Vault',
          extensions: ['lockity']
        }
      ]
    });

    if (result && result.filePaths && result.filePaths[0]) {
      vaultFilePath = result.filePaths[0];

      return { success: true };
    } else {
      return { success: false };
    }
  } catch (error) {
    console.error("Error checking vault existence:", error);
    return { success: false };
  }
});


ipcMain.handle('vault-exists', async () => {
  try {
    return fs.existsSync(vaultFilePath);
  } catch (error) {
    console.error("Error checking vault existence:", error);
    return false;
  }
});


ipcMain.handle('create-vault', async (event: IpcMainInvokeEvent, password: string) => {
  try {
    const encryptionKey = generateKeyFromPassword(password);
    const initialData = [];

    await keytar.setPassword('lockiti', 'decryption-key', encryptionKey.toString('hex'));


    const encryptedData = encryptData(initialData, encryptionKey);

    const { canceled, filePath: savePath } = await dialog.showSaveDialog({
      defaultPath: 'vault.lockity',
      filters: [
        {
          name: 'Lockity Vault',
          extensions: ['lockity']
        }
      ]
    });

    if (canceled) {
      return { success: false };
    }

    fs.writeFileSync(savePath, encryptedData + '\n');

    vaultFilePath = savePath;

    return { success: true };
  } catch (error) {
    console.error("Error creating vault:", error);
    return { success: false, error: "Failed to create vault" };
  }
});


ipcMain.handle('unlock-vault', async (event, password) => {
  try {
    let encryptionKey = null

    if (!password) {
      const encryptionKeyHex = await keytar.getPassword('lockiti', 'decryption-key');
      if (!encryptionKeyHex) return
      encryptionKey = Buffer.from(encryptionKeyHex, 'hex');
    } else {
      encryptionKey = generateKeyFromPassword(password);
      await keytar.setPassword('lockiti', 'decryption-key', encryptionKey.toString('hex'));
    }

    const fileContent = fs.readFileSync(vaultFilePath, 'utf8').trim();
    const decryptedData = decryptData(fileContent, encryptionKey);


    await keytar.setPassword('lockiti', 'decryption-key', encryptionKey.toString('hex'));

    const services = decryptedData.map(entry => ({ service: entry.service }));
    return { success: true, data: services };
  } catch (error) {
    console.error("Error unlocking vault:", error);
    return { success: false, error: "Incorrect password or corrupted vault" };
  }
});


ipcMain.handle('get-service-info', async (event, serviceName) => {
  try {

    const encryptionKeyHex = await keytar.getPassword('lockiti', 'decryption-key');
    if (!encryptionKeyHex) throw new Error("Decryption key not found");

    const encryptionKey = Buffer.from(encryptionKeyHex, 'hex');
    const fileContent = fs.readFileSync(vaultFilePath, 'utf8').trim();
    const decryptedData = decryptData(fileContent, encryptionKey);

    const entry = decryptedData.find(item => item.service === serviceName);
    if (!entry) throw new Error("Service not found");

    return { success: true, data: { username: entry.username, passwordLength: entry.password.length } };
  } catch (error) {
    console.error("Error retrieving service info:", error);
    return { success: false, error: "Failed to retrieve service info" };
  }
});


ipcMain.handle('get-entry', async (event, serviceName, password) => {
  try {
    const encryptionKeyHex = await keytar.getPassword('lockiti', 'decryption-key');
    if (!encryptionKeyHex) throw new Error("Decryption key not found");

    const encryptionKey = Buffer.from(encryptionKeyHex, 'hex');
    const fileContent = fs.readFileSync(vaultFilePath, 'utf8').trim();
    const decryptedData = decryptData(fileContent, encryptionKey);

    const entry = decryptedData.find(item => item.service === serviceName);
    if (!entry) throw new Error("Service not found");

    return { success: true, data: entry };
  } catch (error) {
    console.error("Error retrieving password:", error);
    return { success: false, error: "Failed to retrieve password" };
  }
});


ipcMain.handle('create-entry', async (event, passwordData) => {
  try {

    const encryptionKeyHex = await keytar.getPassword('lockiti', 'decryption-key');
    if (!encryptionKeyHex) throw new Error("Decryption key not found");

    const encryptionKey = Buffer.from(encryptionKeyHex, 'hex');
    const fileContent = fs.readFileSync(vaultFilePath, 'utf8').trim();
    const decryptedData = decryptData(fileContent, encryptionKey);

    const serviceIndex = decryptedData.findIndex(entry => entry.service === passwordData.service);
    if (serviceIndex !== -1) {
      decryptedData[serviceIndex] = passwordData;
    } else {
      decryptedData.push(passwordData);
    }

    const encryptedData = encryptData(decryptedData, encryptionKey);
    fs.writeFileSync(vaultFilePath, encryptedData + '\n');

    return { success: true };
  } catch (error) {
    console.error("Error adding password:", error);
    return { success: false, error: "Failed to add password" };
  }
});


ipcMain.handle('delete-entry', async (event, serviceName) => {
  try {

    const encryptionKeyHex = await keytar.getPassword('lockiti', 'decryption-key');
    if (!encryptionKeyHex) throw new Error("Decryption key not found");

    const encryptionKey = Buffer.from(encryptionKeyHex, 'hex');
    const fileContent = fs.readFileSync(vaultFilePath, 'utf8').trim();
    let decryptedData = decryptData(fileContent, encryptionKey);

    decryptedData = decryptedData.filter(entry => entry.service !== serviceName);

    const encryptedData = encryptData(decryptedData, encryptionKey);
    fs.writeFileSync(vaultFilePath, encryptedData + '\n');

    return { success: true };
  } catch (error) {
    console.error("Error deleting password:", error);
    return { success: false, error: "Failed to delete password" };
  }
});


ipcMain.handle('logout', async () => {
  try {
    await keytar.deletePassword('lockiti', 'decryption-key');
    vaultFilePath = '';
    return { success: true };
  } catch (error) {
    console.error("Error deleting decryption key:", error);
    return { success: false, error: "Failed to delete decryption key" };
  }
});


function generateKeyFromPassword(password) {
  return crypto.scryptSync(password, 'unique-salt', 32);
}


function encryptData(data, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encryptedData = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, encryptedData, authTag]).toString('base64');
}


function decryptData(encryptedData, key) {
  const dataBuffer = Buffer.from(encryptedData, 'base64');

  const iv = dataBuffer.subarray(0, 12);
  const authTag = dataBuffer.subarray(dataBuffer.length - 16);
  const encryptedContent = dataBuffer.subarray(12, dataBuffer.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decryptedData = Buffer.concat([decipher.update(encryptedContent), decipher.final()]);

  return JSON.parse(decryptedData.toString('utf8'));
}
