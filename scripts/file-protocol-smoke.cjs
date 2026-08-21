const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const output = path.resolve(process.env.FILE_PROTOCOL_OUT || '.file-protocol-check.png');

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    paintWhenInitiallyHidden: true,
    backgroundColor: '#080b10',
    webPreferences: { offscreen: true, contextIsolation: true, sandbox: false }
  });
  await window.webContents.session.clearStorageData();
  await window.loadFile(path.resolve('dist/index.html'));
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await window.webContents.executeJavaScript('Boolean(window.ashenCovenant)')) break;
    await wait(50);
  }
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await window.webContents.executeJavaScript('window.ashenCovenant?.renderer.getAssetStatus().pending === 0')) break;
    await wait(50);
  }

  const assetDiagnosis = await window.webContents.executeJavaScript(`(() => {
    const { renderer } = window.ashenCovenant;
    const status = renderer.getAssetStatus();
    const describe = (image) => ({ source: image?.src ?? '', width: image?.naturalWidth ?? 0, height: image?.naturalHeight ?? 0 });
    return {
      status,
      protocol: location.protocol,
      heroMotion: Object.fromEntries(Object.entries(renderer.assets.heroMotion).map(([id, image]) => [id, describe(image)])),
      enemyMotion: Object.fromEntries(Object.entries(renderer.assets.enemyMotion).map(([id, image]) => [id, describe(image)])),
      actionVfx: Object.fromEntries(Object.entries(renderer.assets.actionVfx).map(([id, image]) => [id, describe(image)])),
      equipmentLayers: describe(renderer.assets.equipmentLayers),
      equipmentSignatures: describe(renderer.assets.equipmentSignatures),
      terrainSource: renderer.assets.terrain.src,
      entranceSource: renderer.assets.entrances.src,
      propSource: renderer.assets.props.src,
      npcSource: renderer.assets.npcs.src
    };
  })()`);
  assert.equal(assetDiagnosis.protocol, 'file:', 'release smoke must exercise Electron file:// loading');
  assert.equal(assetDiagnosis.status.ready, true, `required art did not load: ${JSON.stringify(assetDiagnosis.status)}`);
  assert.equal(assetDiagnosis.status.failed.length, 0, 'no required runtime art may fail');
  assert.equal(Object.keys(assetDiagnosis.heroMotion).length, 6, 'all six v7 class motion atlases must load');
  for (const [id, motion] of Object.entries(assetDiagnosis.heroMotion)) {
    assert.ok(motion.source.includes(`/dist/assets/hero-motion-${id}-v7.png`), `${id} hero motion must resolve inside packaged dist/assets`);
    assert.ok(motion.width > 0 && motion.height > 0, `${id} hero motion atlas must decode`);
  }
  for (const [id, motion] of Object.entries(assetDiagnosis.enemyMotion)) {
    assert.ok(motion.source.includes(`/dist/assets/enemy-motion-${id}-v7.png`), `${id} enemy-motion art must resolve inside packaged dist/assets`);
    assert.ok(motion.width > 0 && motion.height > 0, `${id} enemy-motion atlas must decode`);
  }
  for (const [id, sheet] of Object.entries(assetDiagnosis.actionVfx)) {
    assert.ok(sheet.source.includes(`/dist/assets/attack-vfx-${id}-v6.png`), `${id} action animation art must resolve inside packaged dist/assets`);
    assert.ok(sheet.width >= 1_600 && sheet.height >= 700, `${id} action animation sheet must decode at release scale`);
  }
  assert.ok(assetDiagnosis.equipmentLayers.source.includes('/dist/assets/equipment/v7/equipment-layers-v7.svg'), 'equipment layers must resolve inside packaged dist/assets');
  assert.ok(assetDiagnosis.equipmentLayers.width > 0 && assetDiagnosis.equipmentLayers.height > 0, 'equipment layers must decode');
  assert.ok(assetDiagnosis.equipmentSignatures.source.includes('/dist/assets/equipment/v7/equipment-signatures-v7.svg'), 'equipment signatures must resolve inside packaged dist/assets');
  assert.ok(assetDiagnosis.equipmentSignatures.width > 0 && assetDiagnosis.equipmentSignatures.height > 0, 'equipment signatures must decode');
  assert.ok(assetDiagnosis.terrainSource.includes('/dist/assets/terrain/terrain-atlas-v5.png'), 'painted terrain must resolve inside packaged dist/assets');
  assert.ok(assetDiagnosis.entranceSource.includes('/dist/assets/entrance-atlas-v5.png'), 'entrance art must resolve inside packaged dist/assets');
  assert.ok(assetDiagnosis.propSource.includes('/dist/assets/environment-props-v5.png'), 'world prop art must resolve inside packaged dist/assets');
  assert.ok(assetDiagnosis.npcSource.includes('/dist/assets/npc-atlas-v5.png'), 'NPC art must resolve inside packaged dist/assets');

  const titleDiagnosis = await window.webContents.executeJavaScript(`(() => {
    document.querySelectorAll('.class-card')[0]?.click();
    document.querySelectorAll('.class-card')[1]?.click();
    document.querySelector('#new-run')?.click();
    const { game, ui } = window.ashenCovenant;
    if (ui.overlay === 'campaign-dialogue') ui.hideOverlay(true);
    return { hasPlayer: Boolean(game.player), state: game.state, objective: game.objective?.title };
  })()`);
  await wait(500);
  assert.equal(titleDiagnosis.hasPlayer, true, `title screen must start a selected covenant: ${JSON.stringify(titleDiagnosis)}`);
  assert.equal(titleDiagnosis.state, 'playing', `the opening dialogue must return control before a live-combat check: ${JSON.stringify(titleDiagnosis)}`);
  const combatDiagnosis = await window.webContents.executeJavaScript(`(() => {
    const { game, ui } = window.ashenCovenant;
    const launched = game.startBlackRoadExpedition('funeral-road');
    if (!launched) throw new Error(JSON.stringify({ launched, state: game.state, player: Boolean(game.player), objective: game.objective }));
    if (!game.entities.enemies[3]) throw new Error(JSON.stringify({ launched, enemyCount: game.entities.enemies.length, endgame: game.endgame }));
    game.player.hp = game.player.maxHp;
    game.entities.enemies.forEach((enemy) => { enemy.recoveryLeft = 4; });
    game.player.combatTargetId = game.entities.enemies[1].id;
    game._startEnemyAttack(game.entities.enemies[3]);
    game._startEnemyAttack(game.entities.enemies[2]);
    game._focusCamera(true);
    ui.updateHud(true);
    return { state: game.state, enemies: game.entities.enemies.length, target: game.getCombatTarget()?.name };
  })()`);
  assert.equal(combatDiagnosis.state, 'playing', 'a verified file:// build must start a run');
  assert.equal(combatDiagnosis.enemies, 4, 'the rendered check needs the complete first Black Road formation');
  assert.ok(combatDiagnosis.target, 'context target UI must resolve in the packaged build');
  await wait(180);
  const screenshot = (await window.webContents.capturePage()).toPNG();
  const screenshotPath = screenshot.length > 4_000 ? output : null;
  if (screenshotPath) {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(screenshotPath, screenshot);
  }
  console.log(JSON.stringify({ ...assetDiagnosis, ...combatDiagnosis, screenshot: screenshotPath }, null, 2));
  window.destroy();
  app.quit();
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
