const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const suppliedUrl = process.env.VISUAL_URL || null;
const outDir = process.env.VISUAL_OUT || path.resolve(process.cwd(), '.visual-check');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let previewServer = null;

const startPreviewServer = () => new Promise((resolve, reject) => {
  const root = path.resolve(process.cwd(), 'dist');
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon' };
  previewServer = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const target = path.resolve(root, pathname === '/' ? 'index.html' : pathname.slice(1));
    if (!target.startsWith(root)) { response.writeHead(403).end(); return; }
    fs.readFile(target, (error, data) => {
      if (error) { response.writeHead(404).end(); return; }
      response.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream' });
      response.end(data);
    });
  });
  previewServer.once('error', reject);
  previewServer.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${previewServer.address().port}/`));
});

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const url = suppliedUrl || await startPreviewServer();
  const window = new BrowserWindow({
    width: 1500,
    height: 940,
    show: process.env.VISUAL_SHOW === '1',
    webPreferences: { offscreen: true, contextIsolation: true, sandbox: false }
  });
  await window.webContents.session.clearStorageData();
  await window.loadURL(url);
  await wait(850);
  const diagnosis = await window.webContents.executeJavaScript(`({ title: document.title, cards: document.querySelectorAll('.class-card').length, root: document.querySelector('#ui-root')?.childElementCount ?? -1, text: document.body.innerText.slice(0, 120) })`);
  if (!diagnosis.cards) throw new Error(`Visual preview did not mount: ${JSON.stringify(diagnosis)}`);
  fs.mkdirSync(outDir, { recursive: true });
  window.webContents.debugger.attach('1.3');
  const capture = async (width = 1500, height = 940) => {
    const shot = await window.webContents.debugger.sendCommand('Page.captureScreenshot', {
      format: 'png', fromSurface: true, captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height, scale: 1 }
    });
    return Buffer.from(shot.data, 'base64');
  };
  fs.writeFileSync(path.join(outDir, 'title.png'), await capture());
  await window.webContents.executeJavaScript(`
    document.querySelectorAll('.class-card')[0]?.click();
    document.querySelectorAll('.class-card')[1]?.click();
  `);
  await wait(300);
  fs.writeFileSync(path.join(outDir, 'title-pairing.png'), await capture());
  await window.webContents.executeJavaScript(`document.querySelector('#new-run')?.click();`);
  await wait(1250);
  fs.writeFileSync(path.join(outDir, 'gameplay.png'), await capture());
  await window.webContents.executeJavaScript(`
    (() => {
      const { game, ui, presentation } = window.ashenCovenant;
      ui.hideOverlay(true);
      game.player.x = 2980; game.player.y = 610; game.player.facing = -.18;
      game.entities.enemies = [];
      const originalPrimary = game.player.primary;
      game.player.primary = 'warden';
      game._spawnPlayerActionVfx('attack', 1.6, 3);
      game.player.primary = 'gravebinder';
      game.player.x -= 160; game.player.y += 70; game.player.facing = -.32;
      game._spawnPlayerActionVfx('ultimate', 1.6);
      game.player.primary = originalPrimary;
      game.player.x += 160; game.player.y -= 70; game.player.facing = -.18;
      const enemy = game._spawnEnemy('fenwitch', game.player.x + 205, game.player.y - 40, { level: 32, group: 'visual-action-sequence' });
      enemy.recoveryLeft = 1.6;
      game._startEnemyAttack(enemy);
      game._focusCamera(true);
      game.update(.68); presentation.update(.68);
      document.querySelector('#toast-region').innerHTML = '';
    })();
  `);
  await wait(55);
  fs.writeFileSync(path.join(outDir, 'spell-attack-animation.png'), await capture());
  await window.webContents.executeJavaScript(`
    (() => {
      const { game, ui } = window.ashenCovenant;
      ui.hideOverlay(true);
      game.startBlackRoadExpedition('funeral-road');
      const enemy = game.entities.enemies[0];
      if (!enemy) throw new Error('Black Road formation was not spawned');
      game.player.combatTargetId = enemy.id;
      game._engageEnemyGroup(enemy);
      game._startEnemyAttack(game.entities.enemies.find((entry) => entry.group === enemy.group && entry.role === 'shield') ?? enemy);
      game._focusCamera(true);
      ui.updateHud(true);
      document.querySelector('#toast-region').innerHTML = '';
    })();
  `);
  await wait(350);
  fs.writeFileSync(path.join(outDir, 'black-road-formation.png'), await capture());
  await window.webContents.executeJavaScript(`
    (() => {
      const { game, ui, presentation } = window.ashenCovenant;
      ui.hideOverlay(true);
      game.player.x = 2980; game.player.y = 610; game.player.hp = game.player.maxHp;
      game.entities.enemies = [];
      const ids = ['bloodleech', 'fenwitch', 'boghulk', 'reedstalker', 'drownedoracle', 'ashbow'];
      ids.forEach((id, index) => {
        const angle = -1.15 + index * .44;
        const range = index % 2 ? 245 : 185;
        const enemy = game._spawnEnemy(id, game.player.x + Math.cos(angle) * range, game.player.y + Math.sin(angle) * range, { level: 32, group: 'visual-presentation', elite: index === 2 });
        enemy.recoveryLeft = 8;
      });
      game._startEnemyAttack(game.entities.enemies[2]);
      game._startEnemyAttack(game.entities.enemies[5]);
      const item = game._generateItem({ sourceId: 'redfen', minRarity: 'relic', rarity: 'relic', elite: true });
      const drop = { id: 'visual-relic', x: game.player.x + 110, y: game.player.y + 92, item, sourceId: 'redfen', life: 80, bob: 0 };
      game.entities.loot.push(drop); game._presentLootSpawn(drop);
      game._focusCamera(true); presentation.update(.1);
    })();
  `);
  await wait(100);
  fs.writeFileSync(path.join(outDir, 'presentation-combat.png'), await capture());
  await window.webContents.executeJavaScript(`
    (() => {
      const { game, ui, presentation } = window.ashenCovenant;
      game.settings.presentationDebug = true;
      presentation.toggleDebug(true);
      ui.showOverlay('presentation-debug');
    })();
  `);
  await wait(220);
  fs.writeFileSync(path.join(outDir, 'presentation-debug.png'), await capture());
  await window.webContents.executeJavaScript(`window.ashenCovenant.ui.hideOverlay(true); window.ashenCovenant.ui.showOverlay('pause');`);
  await wait(220);
  fs.writeFileSync(path.join(outDir, 'presentation-settings.png'), await capture());
  await window.webContents.executeJavaScript(`window.ashenCovenant.ui.hideOverlay(true);`);
  await window.webContents.executeJavaScript(`document.querySelector('#inventory-button')?.click()`);
  await wait(500);
  fs.writeFileSync(path.join(outDir, 'inventory.png'), await capture());
  await window.webContents.executeJavaScript(`
    document.querySelector('#close-overlay')?.click();
    document.querySelector('#journey-button')?.click();
  `);
  await wait(500);
  fs.writeFileSync(path.join(outDir, 'journey.png'), await capture());
  await window.webContents.executeJavaScript(`document.querySelector('[data-journey-view="pillars"]')?.click()`);
  await wait(350);
  fs.writeFileSync(path.join(outDir, 'pillars.png'), await capture());
  await window.webContents.executeJavaScript(`
    (() => {
      const { game, ui } = window.ashenCovenant;
      game.player.level = 100;
      game.player.skillPoints = 59;
      game.player.leveling = game._normalizeLeveling({ claimedLevels: Array.from({ length: 100 }, (_, index) => index + 1), paragonRank: 18, paragonGlyphEmbers: 25, legacySeeded: true }, 100);
      game._refreshPlayerStats(true);
      ['covenant-heart:entry', 'covenant-heart:right-one', 'covenant-heart:right-two', 'covenant-heart:right-rare', 'covenant-heart:right-bridge', 'covenant-heart:legendary', 'covenant-heart:right-crown', 'covenant-heart:gate', 'covenant-heart:socket'].forEach((id) => game.allocateParagonNode(id));
      game.unlockParagonBoard('warpath');
      game.socketParagonGlyph('covenant-heart:socket', 'ember');
      ui.journeyView = 'paragon';
      ui.paragonBoardId = 'covenant-heart';
      ui.showOverlay('journey');
      document.querySelector('#toast-region').innerHTML = '';
      document.querySelector('#overlay-content').scrollTop = 0;
    })();
  `);
  await wait(500);
  fs.writeFileSync(path.join(outDir, 'paragon.png'), await capture());
  fs.writeFileSync(path.join(outDir, 'paragon.pdf'), await window.webContents.printToPDF({ printBackground: true, landscape: true, pageSize: 'A3' }));
  await window.webContents.executeJavaScript(`document.querySelector('#overlay-content').scrollTop = 620`);
  await wait(200);
  fs.writeFileSync(path.join(outDir, 'paragon-board.pdf'), await window.webContents.printToPDF({ printBackground: true, landscape: true, pageSize: 'A3' }));
  await window.webContents.executeJavaScript(`
    (() => {
      const { game, ui } = window.ashenCovenant;
      game.player.contracts.ledgerXp = 3920;
      game.player.contracts.ledgerRank = 8;
      game.player.contracts.boardCycle += 1;
      game.player.contracts.offers = [];
      ui.operationsView = 'contracts';
      ui.contractRegionFilter = 'all';
      ui.contractDifficultyFilter = 'all';
      ui.showOverlay('endgame');
      document.querySelector('#toast-region').innerHTML = '';
      document.querySelector('#overlay-content').scrollTop = 0;
    })();
  `);
  await wait(500);
  fs.writeFileSync(path.join(outDir, 'contracts.png'), await capture());
  fs.writeFileSync(path.join(outDir, 'contracts.pdf'), await window.webContents.printToPDF({ printBackground: true, landscape: true, pageSize: 'A3' }));
  await window.webContents.executeJavaScript(`
    (() => {
      const { game, ui } = window.ashenCovenant;
      game.player.level = 100;
      game.player.gold = 100000;
      game.player.materials = { cinders: 1000, echoes: 100, shards: 100, prisms: 20, marks: 20, alloys: 100, cores: 20 };
      game._refreshPlayerStats(true);
      ui.chronicleView = 'identity';
      ui.showOverlay('chronicle');
      document.querySelector('#toast-region').innerHTML = '';
      document.querySelector('#overlay-content').scrollTop = 0;
    })();
  `);
  await wait(500);
  fs.writeFileSync(path.join(outDir, 'chronicle-identity.png'), await capture());
  await window.webContents.executeJavaScript(`document.querySelector('[data-chronicle-view="mastery"]')?.click(); document.querySelector('#overlay-content').scrollTop = 0;`);
  await wait(400);
  fs.writeFileSync(path.join(outDir, 'chronicle-mastery.png'), await capture());
  await window.webContents.executeJavaScript(`document.querySelector('[data-chronicle-view="world"]')?.click(); document.querySelector('#overlay-content').scrollTop = 0;`);
  await wait(400);
  fs.writeFileSync(path.join(outDir, 'chronicle-world.png'), await capture());
  await window.webContents.executeJavaScript(`document.querySelector('[data-chronicle-view="endgame"]')?.click(); document.querySelector('#overlay-content').scrollTop = 0;`);
  await wait(400);
  fs.writeFileSync(path.join(outDir, 'chronicle-eclipse.png'), await capture());
  window.setContentSize(1000, 700);
  await wait(450);
  fs.writeFileSync(path.join(outDir, 'chronicle-compact.png'), await capture(1000, 700));
  window.setContentSize(1500, 940);
  await wait(350);
  await window.webContents.executeJavaScript(`
    (() => {
      const { game, ui } = window.ashenCovenant;
      ui.hideOverlay(true);
      game._setCampaignStage('chapter-one-complete', 1);
      game.startEndgame('arena', 12);
      game.entities.enemies = [];
      game._updateEndgame(1);
      game.entities.enemies = [];
      game._updateEndgame(1);
      document.querySelector('#toast-region').innerHTML = '';
    })();
  `);
  await wait(500);
  fs.writeFileSync(path.join(outDir, 'expedition-route.png'), await capture());
  window.webContents.debugger.detach();
  window.destroy();
  previewServer?.close();
  app.quit();
}).catch((error) => {
  console.error(error);
  previewServer?.close();
  app.exit(1);
});
