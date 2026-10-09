import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { WeaponManager } from '../entities/WeaponManager.js';
import { EnemyManager } from '../entities/EnemyManager.js';
import { DestructibleMap } from '../systems/DestructibleMap.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { ScoreManager } from '../systems/ScoreManager.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.levelData = null;
    this.destructibleMap = null;
    this.particleSystem = null;
    this.scoreManager = null;
    this.enemyManager = null;
    this.player = null;
    this.weaponManager = null;
    this.currentPct = 0;
  }

  init(data) {
    this.levelData = data || {
      imageUrl: '/levels/demo.png',
      width: 1280,
      height: 1800,
      title: 'Demo Battlefield'
    };
  }

  preload() {
    // Load the rasterized webpage screenshot
    const levelKey = `level_${Date.now()}`;
    this.levelKey = levelKey;
    this.load.image(levelKey, this.levelData.imageUrl);
  }

  create() {
    const width = this.levelData.width || 1280;
    const height = this.levelData.height || 1800;

    // 1. World & Physics Bounds
    this.physics.world.setBounds(0, 0, width, height);

    // 2. Systems
    this.particleSystem = new ParticleSystem(this);
    this.destructibleMap = new DestructibleMap(this, width, height, 16);
    this.destructibleMap.init(this.levelKey);

    // 3. Score & Combat Systems
    this.scoreManager = new ScoreManager(this);
    this.enemyManager = new EnemyManager(this);

    // 4. Player Entity
    const spawnX = Math.floor(width / 2);
    const spawnY = 160;
    this.player = new Player(this, spawnX, spawnY);

    // 5. Weapon Manager & Enemies
    this.weaponManager = new WeaponManager(this);
    this.enemyManager.initSpawns(6);

    // 6. Camera Setup
    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.startFollow(this.player.container, true, 0.12, 0.12);
    this.cameras.main.setBackgroundColor('#09090d');

    // 6. Controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      ONE: Phaser.Input.Keyboard.KeyCodes.ONE,
      TWO: Phaser.Input.Keyboard.KeyCodes.TWO,
      THREE: Phaser.Input.Keyboard.KeyCodes.THREE,
      FOUR: Phaser.Input.Keyboard.KeyCodes.FOUR,
      FIVE: Phaser.Input.Keyboard.KeyCodes.FIVE,
      SIX: Phaser.Input.Keyboard.KeyCodes.SIX
    });

    // Weapon selection via Number keys
    this.keys.ONE.on('down', () => this.weaponManager.selectWeapon(0));
    this.keys.TWO.on('down', () => this.weaponManager.selectWeapon(1));
    this.keys.THREE.on('down', () => this.weaponManager.selectWeapon(2));
    this.keys.FOUR.on('down', () => this.weaponManager.selectWeapon(3));
    this.keys.FIVE.on('down', () => this.weaponManager.selectWeapon(4));
    this.keys.SIX.on('down', () => this.weaponManager.selectWeapon(5));

    // Mouse wheel weapon cycle
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      if (deltaY > 0) this.weaponManager.nextWeapon();
      else if (deltaY < 0) this.weaponManager.prevWeapon();
    });

    // Prevent context menu on right click so grenade works seamlessly
    this.input.mouse.disableContextMenu();

    // Notify UI that level loaded
    if (window.onGameReady) {
      window.onGameReady(this);
    }
  }

  update(time, delta) {
    const dt = delta / 1000;
    if (!this.player || !this.destructibleMap) return;

    const pointer = this.input.activePointer;

    // 1. Update Score & Combat Systems
    if (this.scoreManager) this.scoreManager.update(dt);
    if (this.enemyManager) this.enemyManager.update(dt);

    // 2. Update Player Controls & Movement
    this.player.update(this.cursors, this.keys, pointer, dt);

    // 3. Resolve Player vs Destructible Map Collision
    if (!this.player.isDead) {
      this.destructibleMap.resolveEntityCollision(this.player, dt);
    }

    // 4. Firing Weapons (Desktop Mouse Click OR Mobile Virtual Fire Button)
    const isFireActive = pointer.isDown || (this.player.touchControls && this.player.touchControls.fire);
    const isGrenadeActive = (pointer.rightButtonDown && pointer.rightButtonDown()) || (this.player.touchControls && this.player.touchControls.grenade);

    if (isFireActive && !this.player.isDead) {
      if (isGrenadeActive) {
        // Quick grenade toss
        const grenadeIdx = 3;
        const currentIdx = this.weaponManager.currentWeaponIndex;
        this.weaponManager.selectWeapon(grenadeIdx);
        this.weaponManager.tryFire(this.player, time);
        this.weaponManager.selectWeapon(currentIdx);
      } else {
        // Normal fire
        this.weaponManager.tryFire(this.player, time);
      }
    }

    // 5. Update Bullets & Projectiles
    this.weaponManager.update(dt);
  }

  onDestructionProgress(pct, count, newlyDestroyed = 1) {
    this.currentPct = pct;

    if (this.scoreManager) {
      this.scoreManager.registerTileDestroyed(newlyDestroyed);
    }

    // Boss Milestone check: Spawns at 50% demolition
    if (pct >= 50 && this.enemyManager && !this.enemyManager.bossSpawned) {
      this.enemyManager.spawnBoss();
    }

    if (window.updateDestructionHUD) {
      window.updateDestructionHUD(pct, count);
    }
  }

  onWeaponChanged(weapon, index) {
    if (window.updateWeaponHUD) {
      window.updateWeaponHUD(weapon, index);
    }
  }

  onPlayerDied() {
    if (this.scoreManager && window.showGameOverModal) {
      const summary = this.scoreManager.calculateSummary(this.currentPct);
      window.showGameOverModal(summary);
    }
  }

  triggerVictory() {
    if (this.scoreManager && window.showVictoryModal) {
      const summary = this.scoreManager.calculateSummary(this.currentPct);
      window.showVictoryModal(summary);
    }
  }

  retryLevel() {
    const spawnX = Math.floor(this.destructibleMap.width / 2);
    const spawnY = 160;
    if (this.player) {
      this.player.respawn(spawnX, spawnY);
    }
    if (this.scoreManager) {
      this.scoreManager.reset();
    }
  }
}
