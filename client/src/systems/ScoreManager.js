import { SoundFX } from './SoundFX.js';

export class ScoreManager {
  constructor(scene) {
    this.scene = scene;
    this.reset();
  }

  reset() {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboMaxDuration = 2.5; // seconds before combo decays
    this.comboTimer = 0;

    this.tilesDestroyed = 0;
    this.minionsKilled = 0;
    this.dronesKilled = 0;
    this.environmentalKills = 0;
    this.bossDefeated = false;
    this.damageTaken = 0;
    this.startTime = Date.now();

    this.syncHUD();
  }

  getMultiplier() {
    if (this.combo >= 50) return 5.0;
    if (this.combo >= 30) return 4.0;
    if (this.combo >= 20) return 3.0;
    if (this.combo >= 10) return 2.0;
    if (this.combo >= 5) return 1.5;
    return 1.0;
  }

  addCombo(amount = 1) {
    this.combo += amount;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
    this.comboTimer = this.comboMaxDuration;

    if (this.combo % 5 === 0) {
      SoundFX.comboUp();
      if (this.scene.particleSystem && this.scene.player) {
        this.scene.particleSystem.spawnTileDebris(
          this.scene.player.x,
          this.scene.player.y - 30,
          0xffaa00,
          4
        );
      }
    }
    this.syncHUD();
  }

  addScore(basePoints) {
    const mult = this.getMultiplier();
    const earned = Math.round(basePoints * mult);
    this.score += earned;
    this.syncHUD();
    return earned;
  }

  registerTileDestroyed(count = 1) {
    this.tilesDestroyed += count;
    this.addCombo(1);
    this.addScore(count * 10);
  }

  registerEnemyKill(type, x, y) {
    this.addCombo(2);
    let base = 200;

    if (type === 'minion') {
      this.minionsKilled++;
      base = 200;
    } else if (type === 'drone') {
      this.dronesKilled++;
      base = 300;
    } else if (type === 'environmental') {
      this.environmentalKills++;
      base = 500; // Double environmental hazard reward
      SoundFX.environmentalKill();
      this.showFloatingText(x, y, '💥 地形殺 x2!!', 0x38bdf8);
    } else if (type === 'boss') {
      this.bossDefeated = true;
      base = 10000;
      this.showFloatingText(x, y, '👑 稽查長被擊潰 +10000!!', 0xf59e0b);
    }

    const earned = this.addScore(base);
    if (type !== 'environmental' && type !== 'boss') {
      this.showFloatingText(x, y, `+${earned}`, 0x22c55e);
    }
  }

  registerPlayerDamaged(amount) {
    this.damageTaken += amount;
    if (this.combo > 0) {
      this.combo = 0;
      this.comboTimer = 0;
      SoundFX.comboDrop();
      this.syncHUD();
    }
  }

  showFloatingText(x, y, text, color = 0xffffff) {
    if (!this.scene) return;
    const txt = this.scene.add.text(x, y - 10, text, {
      fontFamily: 'Courier New, monospace',
      fontSize: '15px',
      fontStyle: 'bold',
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#000000',
      strokeThickness: 3
    });
    txt.setOrigin(0.5, 0.5);

    this.scene.tweens.add({
      targets: txt,
      y: y - 45,
      alpha: 0,
      duration: 1000,
      ease: 'Power1',
      onComplete: () => txt.destroy()
    });
  }

  update(delta) {
    if (this.combo > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboTimer = 0;
        SoundFX.comboDrop();
        this.syncHUD();
      } else {
        // Continuous HUD ratio update for the burning progress bar
        if (window.updateScoreHUD) {
          const ratio = Math.max(0, this.comboTimer / this.comboMaxDuration);
          window.updateScoreHUD(this.score, this.combo, this.getMultiplier(), ratio);
        }
      }
    }
  }

  syncHUD() {
    if (window.updateScoreHUD) {
      const ratio = this.combo > 0 ? Math.max(0, this.comboTimer / this.comboMaxDuration) : 0;
      window.updateScoreHUD(this.score, this.combo, this.getMultiplier(), ratio);
    }
  }

  calculateSummary(demolitionPct) {
    const elapsedSec = Math.max(1, Math.floor((Date.now() - this.startTime) / 1000));
    const totalKills = this.minionsKilled + this.dronesKilled + this.environmentalKills;

    // Composite rating formula:
    // Demolition % (up to 4000 pts)
    // Score (scaled)
    // Environmental Kills (heavy bonus)
    // Damage penalty
    let performanceRating = 
      (demolitionPct * 80) + 
      (totalKills * 150) + 
      (this.environmentalKills * 350) + 
      (this.maxCombo * 60) + 
      (this.bossDefeated ? 5000 : 0) - 
      (this.damageTaken * 8);

    let rank = 'C';
    let title = '菜鳥拆遷工';

    if (performanceRating >= 14000 || (demolitionPct >= 90 && this.bossDefeated)) {
      rank = 'SSS';
      title = '夜市米其林食安拆遷天王';
    } else if (performanceRating >= 10000 || this.bossDefeated) {
      rank = 'SS';
      title = '恐懼美食生化狂轟宗師';
    } else if (performanceRating >= 7000 || demolitionPct >= 60) {
      rank = 'S';
      title = '夜市第一快拆手';
    } else if (performanceRating >= 4500 || demolitionPct >= 40) {
      rank = 'A';
      title = '特級拆遷專家';
    } else if (performanceRating >= 2500 || demolitionPct >= 20) {
      rank = 'B';
      title = '夜市街頭游擊隊';
    } else if (performanceRating < 1000) {
      rank = 'D';
      title = '被食安處勒令停業的攤販';
    }

    return {
      score: this.score,
      rank,
      title,
      demolitionPct,
      tilesDestroyed: this.tilesDestroyed,
      totalKills,
      environmentalKills: this.environmentalKills,
      maxCombo: this.maxCombo,
      damageTaken: this.damageTaken,
      bossDefeated: this.bossDefeated,
      elapsedSec
    };
  }
}
