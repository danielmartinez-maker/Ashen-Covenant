const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('ashenDesktop', Object.freeze({ desktop: true }));
