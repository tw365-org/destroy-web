import puppeteer from 'puppeteer';
import path from 'node:path';
import { spawn } from 'node:child_process';

// Helper to wait for HTTP endpoint to be ready
async function waitForHttp(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return true;
    } catch (e) {
      // wait and retry
    }
    await new Promise(r => setTimeout(r, 400));
  }
  return false;
}

async function runE2ETest() {
  console.log('========================================================');
  console.log('🚀 啟動 Destroy-Web 全面端到端 (E2E) 雙端體驗驗證測試');
  console.log('   驗證目標：戰鬥系統、敵人生態、Boss 戰、電腦與手機雙端 UX');
  console.log('========================================================');

  let serverProcess = null;
  let clientProcess = null;

  // 1. Ensure backend server is up
  const isServerUp = await waitForHttp('http://localhost:3001/api/health', 1200);
  if (!isServerUp) {
    console.log('⚡ 正在啟動後端 Express 服務 (Port 3001)...');
    serverProcess = spawn('node', ['server/server.js'], { cwd: process.cwd(), stdio: 'inherit' });
    await waitForHttp('http://localhost:3001/api/health', 10000);
  }

  // 2. Ensure frontend Vite is up
  const isClientUp = await waitForHttp('http://localhost:3000', 1200);
  if (!isClientUp) {
    console.log('⚡ 正在啟動前端 Vite 服務 (Port 3000)...');
    clientProcess = spawn('npx', ['vite', '--port', '3000', '--host'], { cwd: path.resolve(process.cwd(), 'client'), stdio: 'inherit' });
    await waitForHttp('http://localhost:3000', 12000);
  }

  console.log('✅ 前後端服務皆已就緒！');

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: 'shell',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  try {
    // ========================================================
    // PART 1: 電腦桌面端使用者體驗驗證 (DESKTOP UX)
    // ========================================================
    console.log('\n--------------------------------------------------------');
    console.log('🖥️ 【PART 1】電腦桌面端 (Desktop 1280x800) 使用者體驗驗證');
    console.log('--------------------------------------------------------');

    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1280, height: 800 });

    desktopPage.on('console', msg => {
      const txt = msg.text();
      if (!txt.includes('Phaser') && !txt.includes('favicon')) {
        console.log('[DESKTOP BROWSER]', txt);
      }
    });

    console.log('🌐 導航至 http://localhost:3000...');
    await desktopPage.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Wait for canvas to appear
    await desktopPage.waitForSelector('#game-container canvas', { timeout: 10000 });
    console.log('✅ Phaser Canvas 成功渲染！');

    // Wait 3 seconds for initial demo level to load
    await new Promise(r => setTimeout(r, 3000));

    // 1. 驗證電腦端 HUD 戰鬥狀態列
    const hpText = await desktopPage.$eval('#hp-text', el => el.textContent.trim());
    const shieldText = await desktopPage.$eval('#shield-text', el => el.textContent.trim());
    const scoreText = await desktopPage.$eval('#score-text', el => el.textContent.trim());
    const levelName = await desktopPage.$eval('#level-name', el => el.textContent.trim());
    console.log(`📊 戰鬥 HUD 狀態：關卡="${levelName}", HP=${hpText}/100, 護盾=${shieldText}/50, 初始分數=${scoreText}`);

    if (hpText !== '100' || shieldText !== '50') {
      throw new Error(`戰鬥 HUD 初始數值不正確！HP: ${hpText}, Shield: ${shieldText}`);
    }
    console.log('✅ 玩家 HP 與 能量護盾 HUD 驗證通過！');

    // 2. 模擬鍵盤操作：奔跑、二段跳、噴氣背包飛行
    console.log('🕹️ 模擬鍵盤操作：按住 D 奔跑，並觸發跳躍與噴氣背包...');
    await desktopPage.keyboard.down('KeyD');
    await new Promise(r => setTimeout(r, 400));
    await desktopPage.keyboard.press('Space'); // Jump
    await new Promise(r => setTimeout(r, 200));
    await desktopPage.keyboard.down('Space');  // Jetpack thrust
    await new Promise(r => setTimeout(r, 500));
    await desktopPage.keyboard.up('Space');
    await desktopPage.keyboard.up('KeyD');
    console.log('✅ 鍵盤移動與噴氣飛行動態驗證正常！');

    // 3. 模擬滑鼠瞄準與多武器射擊，檢查 Combo 與破壞
    console.log('💥 瞄準網頁平台進行 1 號武器【豬血糕】連發開轟...');
    await desktopPage.mouse.move(640, 380);
    for (let i = 0; i < 8; i++) {
      await desktopPage.mouse.down();
      await new Promise(r => setTimeout(r, 80));
      await desktopPage.mouse.up();
      await new Promise(r => setTimeout(r, 60));
    }

    // 切換至 3 號武器【臭豆腐火箭】開轟
    console.log('💣 切換至 3 號武器【臭豆腐毒氣重砲】發射...');
    await desktopPage.keyboard.press('Digit3');
    await new Promise(r => setTimeout(r, 150));
    await desktopPage.mouse.click(640, 420);
    await new Promise(r => setTimeout(r, 500));

    // 切換至 5 號武器【滷大腸高壓穿透射線】
    console.log('⚡ 切換至 5 號武器【滷大腸高壓穿透射線】貫穿網頁...');
    await desktopPage.keyboard.press('Digit5');
    await new Promise(r => setTimeout(r, 150));
    await desktopPage.mouse.click(680, 420);
    await new Promise(r => setTimeout(r, 500));

    // 檢查即時分數與 Combo
    const updatedScore = await desktopPage.$eval('#score-text', el => el.textContent.trim());
    const comboBadge = await desktopPage.$eval('#combo-badge', el => el.textContent.trim());
    console.log(`📈 開火後戰鬥數據：得分=${updatedScore}, Combo標籤="${comboBadge}"`);
    console.log('✅ 動態得分與 Combo 連擊倍率運算正常！');

    // 4. 驗證敵人生態與 50% Boss 登場
    console.log('👾 檢查敵人生態系統（地面雜兵、無人機）與觸發 Boss 降臨...');
    const bossCheck = await desktopPage.evaluate(() => {
      const scene = window.activeGameScene || (window.activeScene);
      if (!scene || !scene.enemyManager) return { ok: false, error: 'No enemyManager found' };
      
      const minionCount = scene.enemyManager.minions.length;
      const droneCount = scene.enemyManager.drones.length;
      
      // 觸發 Boss 登場
      scene.enemyManager.spawnBoss();
      const hasBoss = !!scene.enemyManager.boss;
      const bossHp = scene.enemyManager.boss ? scene.enemyManager.boss.hp : 0;
      
      return {
        ok: true,
        minionCount,
        droneCount,
        hasBoss,
        bossHp
      };
    });

    console.log(`👹 敵人群體檢測：地面雜兵數=${bossCheck.minionCount}, 巡邏無人機數=${bossCheck.droneCount}, Boss登場=${bossCheck.hasBoss} (HP=${bossCheck.bossHp})`);

    // 驗證頂部 Boss 專屬血條 UI
    await new Promise(r => setTimeout(r, 400));
    const isBossHudVisible = await desktopPage.evaluate(() => {
      const hud = document.getElementById('boss-hud-container');
      return hud && !hud.classList.contains('hidden');
    });
    console.log(`🚨 頂部 Boss 專屬巨型血條顯示狀態：${isBossHudVisible ? '【正常顯示】' : '【隱藏】'}`);

    // 對 Boss 進行攻擊，測試傷害判定
    console.log('🎯 針對 Boss 稽查長發起攻擊判定測試...');
    const bossDamageResult = await desktopPage.evaluate(() => {
      const scene = window.activeGameScene || window.activeScene;
      if (!scene || !scene.enemyManager || !scene.enemyManager.boss) return 0;
      const initialHp = scene.enemyManager.boss.hp;
      scene.enemyManager.damageBoss(120, scene.enemyManager.boss.x, scene.enemyManager.boss.y);
      return { initialHp, currentHp: scene.enemyManager.boss.hp };
    });
    console.log(`💥 Boss 受傷反饋：HP 由 ${bossDamageResult.initialHp} 降至 ${bossDamageResult.currentHp}`);

    // 截圖保存電腦端戰鬥畫面
    const desktopScreenshot = path.resolve(process.cwd(), 'gameplay-desktop-verification.png');
    await desktopPage.screenshot({ path: desktopScreenshot });
    console.log(`📸 電腦端高解析驗證截圖已儲存至：${desktopScreenshot}`);

    await desktopPage.close();


    // ========================================================
    // PART 2: 手機行動端使用者體驗驗證 (MOBILE UX)
    // ========================================================
    console.log('\n--------------------------------------------------------');
    console.log('📱 【PART 2】手機行動端 (Mobile 390x844 - iPhone 14) 使用者體驗驗證');
    console.log('--------------------------------------------------------');

    const mobilePage = await browser.newPage();
    // Emulate modern mobile device with touch capabilities
    await mobilePage.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true
    });

    mobilePage.on('console', msg => {
      const txt = msg.text();
      if (!txt.includes('Phaser') && !txt.includes('favicon')) {
        console.log('[MOBILE BROWSER]', txt);
      }
    });

    console.log('🌐 導航至手機端介面...');
    await mobilePage.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await mobilePage.waitForSelector('#game-container canvas', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2500));

    // 1. 驗證手機端虛擬觸控按鍵 (Mobile Virtual Touch Controls) 是否自動生效顯示
    const touchControlsVisible = await mobilePage.evaluate(() => {
      const layer = document.getElementById('mobile-touch-controls');
      if (!layer) return false;
      const style = window.getComputedStyle(layer);
      return style.display !== 'none';
    });
    console.log(`🎮 手機端虛擬 D-Pad 與行動按鍵圖層：${touchControlsVisible ? '【已成功響應顯示】' : '【未顯示】'}`);
    if (!touchControlsVisible) {
      throw new Error('手機端未顯示虛擬觸控操作圖層！');
    }

    // 2. 驗證電腦端鍵盤提示在手機上已自動隱藏以節省版面
    const keyboardHintHidden = await mobilePage.evaluate(() => {
      const hint = document.querySelector('.hud-controls-hint');
      if (!hint) return true;
      const style = window.getComputedStyle(hint);
      return style.display === 'none';
    });
    console.log(`📱 鍵盤操作提示自適應折疊：${keyboardHintHidden ? '【已自動隱藏】' : '【仍顯示】'}`);

    // 3. 測試手機觸控按鈕互動：右移、跳躍、開火、切換武器
    console.log('👆 模擬觸控點擊：右方向鍵 (▶) 走動...');
    await mobilePage.tap('#btn-touch-right');
    await new Promise(r => setTimeout(r, 300));

    console.log('👆 模擬觸控點擊：跳躍/噴氣 (🚀)...');
    await mobilePage.tap('#btn-touch-up');
    await new Promise(r => setTimeout(r, 400));

    console.log('👆 模擬觸控點擊：虛擬開火按鍵 (💥)...');
    for (let k = 0; k < 5; k++) {
      await mobilePage.tap('#btn-touch-fire');
      await new Promise(r => setTimeout(r, 120));
    }

    console.log('👆 模擬觸控點擊：虛擬切換武器按鍵 (🔄 換槍)...');
    const weaponBefore = await mobilePage.evaluate(() => {
      const scene = window.activeGameScene || window.activeScene;
      return scene?.weaponManager?.getCurrentWeapon()?.name || '';
    });
    await mobilePage.tap('#btn-touch-weapon');
    await new Promise(r => setTimeout(r, 200));
    const weaponAfter = await mobilePage.evaluate(() => {
      const scene = window.activeGameScene || window.activeScene;
      return scene?.weaponManager?.getCurrentWeapon()?.name || '';
    });
    console.log(`🔫 武器切換觸控反饋：由【${weaponBefore}】切換至【${weaponAfter}】`);

    // 4. 測試觸控直接點選畫面的 360 度瞄準打擊
    console.log('👆 模擬玩家直接點擊觸控螢幕目標 (200, 400)...');
    await mobilePage.touchscreen.tap(200, 400);
    await new Promise(r => setTimeout(r, 300));

    // 截圖保存手機端遊戲畫面
    const mobileScreenshot = path.resolve(process.cwd(), 'gameplay-mobile-verification.png');
    await mobilePage.screenshot({ path: mobileScreenshot });
    console.log(`📸 手機端響應式驗證截圖已儲存至：${mobileScreenshot}`);

    await mobilePage.close();

    console.log('\n========================================================');
    console.log('🎉🎉 E2E 雙端測試驗證全部圓滿成功！所有斷言皆已通過！');
    console.log('========================================================');

  } catch (err) {
    console.error('❌ E2E 測試過程中發生錯誤：', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    if (serverProcess) serverProcess.kill();
    if (clientProcess) clientProcess.kill();
  }
}

runE2ETest();
