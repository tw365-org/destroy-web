import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { WEAPON_TYPES } from './entities/WeaponManager.js';

let game = null;
let activeScene = null;
let startTime = Date.now();
let lastCompletedMilestone = 0;

export function initPhaserGame(initialLevelData) {
  const container = document.getElementById('game-container');
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || (window.innerHeight - 100);

  const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: width,
    height: height,
    pixelArt: true,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false
      }
    },
    scene: [GameScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    }
  };

  game = new Phaser.Game(config);

  // Pass initial level data when scene boots
  game.scene.start('GameScene', initialLevelData);
}

// Global hook called by GameScene when ready
window.onGameReady = (scene) => {
  activeScene = scene;
  window.activeScene = scene;
  window.activeGameScene = scene;
  startTime = Date.now();
  lastCompletedMilestone = 0;
  console.log('GameScene ready and running!');
};

// Global hook for player HP and Shield HUD
window.updatePlayerHUD = (hp, maxHp, shield, maxShield) => {
  const hpFill = document.getElementById('hp-bar-fill');
  const hpText = document.getElementById('hp-text');
  const shieldFill = document.getElementById('shield-bar-fill');
  const shieldText = document.getElementById('shield-text');

  if (hpFill) {
    const hpPct = Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)));
    hpFill.style.width = `${hpPct}%`;
  }
  if (hpText) hpText.textContent = Math.round(hp);

  if (shieldFill) {
    const shieldPct = Math.max(0, Math.min(100, Math.round((shield / maxShield) * 100)));
    shieldFill.style.width = `${shieldPct}%`;
  }
  if (shieldText) shieldText.textContent = Math.round(shield);
};

// Global hook for Boss Health Bar
window.updateBossHUD = (hp, maxHp, isVisible, bossName = '🚨 夜市食安特級稽查長') => {
  const container = document.getElementById('boss-hud-container');
  const title = document.getElementById('boss-hud-title');
  const text = document.getElementById('boss-hp-text');
  const fill = document.getElementById('boss-bar-fill');

  if (!container) return;

  if (isVisible && hp > 0) {
    container.classList.remove('hidden');
    if (title) title.textContent = bossName;
    if (text) text.textContent = `${Math.round(hp)} / ${maxHp}`;
    if (fill) {
      const pct = Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)));
      fill.style.width = `${pct}%`;
    }
  } else {
    container.classList.add('hidden');
  }
};

// Global hook for dynamic Score & Combo HUD
window.updateScoreHUD = (score, combo, multiplier, timerRatio) => {
  const scoreEl = document.getElementById('score-text');
  const badgeEl = document.getElementById('combo-badge');
  const fillEl = document.getElementById('combo-bar-fill');

  if (scoreEl) scoreEl.textContent = score.toLocaleString();

  if (badgeEl) {
    if (combo > 0) {
      badgeEl.textContent = `COMBO x${multiplier.toFixed(1)} (${combo})`;
      badgeEl.classList.add('active');
    } else {
      badgeEl.textContent = `COMBO x1.0`;
      badgeEl.classList.remove('active');
    }
  }

  if (fillEl) {
    fillEl.style.width = `${Math.round(timerRatio * 100)}%`;
  }
};

// Global hook for live destruction progress
window.updateDestructionHUD = (pct, count) => {
  const fill = document.getElementById('progress-fill');
  const text = document.getElementById('progress-text');
  if (fill) fill.style.width = `${pct}%`;
  if (text) text.textContent = `${pct}%`;

  // Milestone triggers
  if (pct >= 90 && lastCompletedMilestone < 90) {
    lastCompletedMilestone = 90;
    if (activeScene && activeScene.triggerVictory) {
      activeScene.triggerVictory();
    }
  }
};

// Global hook for weapon selection HUD
window.updateWeaponHUD = (weapon, index) => {
  const slots = document.querySelectorAll('.weapon-slot');
  slots.forEach((slot, idx) => {
    if (idx === index) slot.classList.add('active');
    else slot.classList.remove('active');
  });
};

window.showVictoryModal = (summary) => {
  const modal = document.getElementById('victory-modal');
  if (!modal) return;

  const data = summary || {
    score: 0,
    rank: 'S',
    title: '夜市第一快拆手',
    demolitionPct: 50,
    tilesDestroyed: 0,
    totalKills: 0,
    environmentalKills: 0,
    maxCombo: 0,
    elapsedSec: 30,
    bossDefeated: true
  };

  const rankBadge = document.getElementById('stat-rank-badge');
  const nightTitle = document.getElementById('stat-night-title');
  const scoreVal = document.getElementById('stat-score');
  const statPct = document.getElementById('stat-pct');
  const statTiles = document.getElementById('stat-tiles');
  const statKills = document.getElementById('stat-kills');
  const statEnvKills = document.getElementById('stat-env-kills');
  const statCombo = document.getElementById('stat-combo');
  const statTime = document.getElementById('stat-time');
  const statBoss = document.getElementById('stat-boss-status');

  if (rankBadge) {
    rankBadge.textContent = data.rank;
    rankBadge.className = `rank-badge-display rank-${data.rank.toLowerCase()}`;
  }
  if (nightTitle) nightTitle.textContent = data.title;
  if (scoreVal) scoreVal.textContent = data.score.toLocaleString();
  if (statPct) statPct.textContent = `${data.demolitionPct}%`;
  if (statTiles) statTiles.textContent = data.tilesDestroyed.toLocaleString();
  if (statKills) statKills.textContent = data.totalKills.toLocaleString();
  if (statEnvKills) statEnvKills.textContent = data.environmentalKills.toLocaleString();
  if (statCombo) statCombo.textContent = `x${data.maxCombo}`;
  if (statTime) statTime.textContent = `${data.elapsedSec}s`;
  if (statBoss) statBoss.textContent = data.bossDefeated ? '⚡ 已擊潰' : '逃逸中';

  modal.classList.remove('hidden');
};

window.showGameOverModal = (summary) => {
  const modal = document.getElementById('gameover-modal');
  if (!modal) return;

  const data = summary || {
    score: 0,
    rank: 'D',
    demolitionPct: 0,
    totalKills: 0
  };

  const rankEl = document.getElementById('go-stat-rank');
  const scoreEl = document.getElementById('go-stat-score');
  const pctEl = document.getElementById('go-stat-pct');
  const killsEl = document.getElementById('go-stat-kills');

  if (rankEl) rankEl.textContent = data.rank;
  if (scoreEl) scoreEl.textContent = data.score.toLocaleString();
  if (pctEl) pctEl.textContent = `${data.demolitionPct}%`;
  if (killsEl) killsEl.textContent = data.totalKills.toLocaleString();

  modal.classList.remove('hidden');
};

export async function fetchAndLoadLevel(url) {
  const modal = document.getElementById('loading-modal');
  const statusMsg = document.getElementById('loading-status');
  const titleDisplay = document.getElementById('level-name');

  if (modal) modal.classList.remove('hidden');
  if (statusMsg) statusMsg.textContent = `拆遷大隊正在進場掃描：${url}...`;

  try {
    const res = await fetch('/api/rasterize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const data = await res.json();
    if (!data.success) {
      alert(`錯誤：${data.error || '無法掃描並載入目標網頁'}`);
      if (modal) modal.classList.add('hidden');
      return;
    }

    if (titleDisplay) {
      titleDisplay.textContent = data.title || url;
    }

    // Reset progress HUD
    window.updateDestructionHUD(0, 0);

    // If game not initialized yet, start it
    if (!game) {
      initPhaserGame(data);
    } else {
      // Restart current scene with new level data
      game.scene.stop('GameScene');
      game.scene.start('GameScene', data);
    }
  } catch (err) {
    console.error('Level load error:', err);
    alert('無法連接到拆遷後端伺服器，請確認後端 3001 埠正在運行中。');
  } finally {
    if (modal) modal.classList.add('hidden');
  }
}

// Setup Event Listeners on DOM Load
window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('url-form');
  const input = document.getElementById('url-input');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input.value.trim();
      if (val) {
        fetchAndLoadLevel(val);
      }
    });
  }

  // Preset chips
  document.querySelectorAll('.preset-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const url = chip.getAttribute('data-url');
      if (input) input.value = url;
      fetchAndLoadLevel(url);
    });
  });

  // Weapon HUD slots clicking
  document.querySelectorAll('.weapon-slot').forEach((slot) => {
    slot.addEventListener('click', () => {
      const idx = parseInt(slot.getAttribute('data-idx'), 10);
      if (activeScene && activeScene.weaponManager) {
        activeScene.weaponManager.selectWeapon(idx);
      }
    });
  });

  // Victory modal buttons
  const btnKeepDestroying = document.getElementById('btn-keep-destroying');
  if (btnKeepDestroying) {
    btnKeepDestroying.addEventListener('click', () => {
      document.getElementById('victory-modal').classList.add('hidden');
    });
  }

  const btnNewSite = document.getElementById('btn-new-site');
  if (btnNewSite) {
    btnNewSite.addEventListener('click', () => {
      document.getElementById('victory-modal').classList.add('hidden');
      if (input) {
        input.focus();
        input.select();
      }
    });
  }

  // Game Over modal buttons
  const btnRetry = document.getElementById('btn-retry');
  if (btnRetry) {
    btnRetry.addEventListener('click', () => {
      document.getElementById('gameover-modal').classList.add('hidden');
      if (activeScene && activeScene.retryLevel) {
        activeScene.retryLevel();
      }
    });
  }

  const btnGoNewSite = document.getElementById('btn-go-new-site');
  if (btnGoNewSite) {
    btnGoNewSite.addEventListener('click', () => {
      document.getElementById('gameover-modal').classList.add('hidden');
      if (input) {
        input.focus();
        input.select();
      }
    });
  }

  // Mobile Virtual Touch Controls
  const setupTouchBtn = (id, onDown, onUp) => {
    const el = document.getElementById(id);
    if (!el) return;

    const handleDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      onDown();
    };

    const handleUp = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (onUp) onUp();
    };

    el.addEventListener('pointerdown', handleDown);
    el.addEventListener('pointerup', handleUp);
    el.addEventListener('pointercancel', handleUp);
    el.addEventListener('pointerleave', handleUp);
  };

  setupTouchBtn(
    'btn-touch-left',
    () => { if (activeScene?.player) activeScene.player.touchControls.left = true; },
    () => { if (activeScene?.player) activeScene.player.touchControls.left = false; }
  );

  setupTouchBtn(
    'btn-touch-right',
    () => { if (activeScene?.player) activeScene.player.touchControls.right = true; },
    () => { if (activeScene?.player) activeScene.player.touchControls.right = false; }
  );

  setupTouchBtn(
    'btn-touch-up',
    () => {
      if (activeScene?.player) {
        activeScene.player.touchControls.justJump = true;
        activeScene.player.touchControls.up = true;
      }
    },
    () => { if (activeScene?.player) activeScene.player.touchControls.up = false; }
  );

  setupTouchBtn(
    'btn-touch-down',
    () => { if (activeScene?.player) activeScene.player.touchControls.down = true; },
    () => { if (activeScene?.player) activeScene.player.touchControls.down = false; }
  );

  setupTouchBtn(
    'btn-touch-fire',
    () => { if (activeScene?.player) activeScene.player.touchControls.fire = true; },
    () => { if (activeScene?.player) activeScene.player.touchControls.fire = false; }
  );

  setupTouchBtn(
    'btn-touch-grenade',
    () => {
      if (activeScene?.player) {
        activeScene.player.touchControls.grenade = true;
        activeScene.player.touchControls.fire = true;
      }
    },
    () => {
      if (activeScene?.player) {
        activeScene.player.touchControls.grenade = false;
        activeScene.player.touchControls.fire = false;
      }
    }
  );

  const btnTouchWeapon = document.getElementById('btn-touch-weapon');
  if (btnTouchWeapon) {
    btnTouchWeapon.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (activeScene?.weaponManager) {
        activeScene.weaponManager.nextWeapon();
      }
    });
  }

  // Load default demo level immediately!
  fetchAndLoadLevel('demo');
});
