import { SoundFX } from '../systems/SoundFX.js';

export class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = 20;
    this.height = 38;

    this.vx = 0;
    this.vy = 0;
    this.speed = 280;
    this.gravity = 1100;
    this.jumpForce = -480;
    this.jetpackForce = -1500;

    this.onGround = false;
    this.canDoubleJump = true;
    this.isFlipping = false;
    this.flipAngle = 0;
    this.isJetpacking = false;

    // Visual Stickman Container
    this.container = scene.add.container(x, y);

    // Graphics representation of retro stickman
    this.graphics = scene.add.graphics();
    this.container.add(this.graphics);

    // Weapon arm / barrel graphics
    this.gunGraphics = scene.add.graphics();
    this.container.add(this.gunGraphics);

    this.facingRight = true;
    this.aimAngle = 0;

    // Health, Shield & Combat State
    this.maxHp = 100;
    this.hp = 100;
    this.maxShield = 50;
    this.shield = 50;
    this.shieldRechargeDelay = 3.5;
    this.shieldRechargeTimer = 0;
    this.shieldRechargeRate = 20;

    this.isInvulnerable = false;
    this.invulnerableTimer = 0;
    this.isDead = false;

    // Mobile touch controls state
    this.touchControls = {
      left: false,
      right: false,
      up: false,
      down: false,
      fire: false,
      grenade: false
    };

    // Shield protective aura graphics
    this.shieldGraphics = scene.add.graphics();
    this.container.add(this.shieldGraphics);

    this.drawStickman();
    this.updateShieldVisual();
    this.syncHUD();
  }

  drawStickman() {
    this.graphics.clear();
    this.graphics.lineStyle(3, 0xffffff, 1);

    // Head
    this.graphics.fillStyle(0xffffff, 1);
    this.graphics.fillCircle(0, -12, 6);
    this.graphics.strokeCircle(0, -12, 6);

    // Torso
    this.graphics.beginPath();
    this.graphics.moveTo(0, -6);
    this.graphics.lineTo(0, 10);
    this.graphics.strokePath();

    // Legs
    this.graphics.beginPath();
    this.graphics.moveTo(0, 10);
    this.graphics.lineTo(-6, 20);
    this.graphics.moveTo(0, 10);
    this.graphics.lineTo(6, 20);
    this.graphics.strokePath();

    // Jetpack cylinder on back
    this.graphics.fillStyle(0x475569, 1);
    this.graphics.fillRect(-9, -4, 4, 12);
  }

  drawGun(angle) {
    this.gunGraphics.clear();
    this.aimAngle = angle;

    // Draw gun extending towards cursor
    this.gunGraphics.lineStyle(4, 0x94a3b8, 1);
    const armStartX = 0;
    const armStartY = 0;
    const barrelLen = 14;

    const barrelEndX = armStartX + Math.cos(angle) * barrelLen;
    const barrelEndY = armStartY + Math.sin(angle) * barrelLen;

    this.gunGraphics.beginPath();
    this.gunGraphics.moveTo(armStartX, armStartY);
    this.gunGraphics.lineTo(barrelEndX, barrelEndY);
    this.gunGraphics.strokePath();
  }

  updateShieldVisual() {
    this.shieldGraphics.clear();
    if (this.shield > 0) {
      const alpha = Math.min(0.6, 0.2 + (this.shield / this.maxShield) * 0.4);
      this.shieldGraphics.lineStyle(2, 0x38bdf8, alpha);
      this.shieldGraphics.strokeCircle(0, 4, 22);
      this.shieldGraphics.fillStyle(0x0ea5e9, alpha * 0.2);
      this.shieldGraphics.fillCircle(0, 4, 22);
    }
  }

  syncHUD() {
    if (window.updatePlayerHUD) {
      window.updatePlayerHUD(this.hp, this.maxHp, this.shield, this.maxShield);
    }
  }

  takeDamage(amount, sourceX = 0, sourceY = 0) {
    if (this.isDead || this.isInvulnerable) return false;

    let remaining = amount;
    const prevShield = this.shield;

    if (this.shield > 0) {
      if (this.shield >= remaining) {
        this.shield -= remaining;
        remaining = 0;
      } else {
        remaining -= this.shield;
        this.shield = 0;
      }
      this.updateShieldVisual();
    }

    if (prevShield > 0 && this.shield <= 0) {
      SoundFX.playerShieldDown();
      if (this.scene.particleSystem) {
        this.scene.particleSystem.spawnTileDebris(this.x, this.y, 0x38bdf8, 6);
      }
    }

    if (remaining > 0) {
      this.hp = Math.max(0, this.hp - remaining);
      SoundFX.playerHurt();
    }

    // Reset shield recharge timer on hit
    this.shieldRechargeTimer = this.shieldRechargeDelay;

    // Trigger invulnerability frames (0.8s)
    this.isInvulnerable = true;
    this.invulnerableTimer = 0.8;

    // Knockback
    const knockDir = sourceX ? Math.sign(this.x - sourceX) : (this.facingRight ? -1 : 1);
    this.vx = (knockDir === 0 ? 1 : knockDir) * 280;
    this.vy = -220;

    // Camera shake & hit effect
    this.scene.cameras.main.shake(140, 0.009);

    // Notify ScoreManager of damage taken (breaks combo)
    if (this.scene.scoreManager) {
      this.scene.scoreManager.registerPlayerDamaged(amount);
    }

    this.syncHUD();

    if (this.hp <= 0) {
      this.die();
    }

    return true;
  }

  heal(amount) {
    if (this.isDead) return;
    const oldHp = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    const healed = this.hp - oldHp;

    SoundFX.foodPickup();

    if (this.scene.scoreManager) {
      this.scene.scoreManager.showFloatingText(this.x, this.y, `+${healed} HP`, 0x10b981);
    }

    this.syncHUD();
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.hp = 0;
    this.shield = 0;
    this.updateShieldVisual();
    this.syncHUD();

    SoundFX.playerDeath();

    if (this.scene.particleSystem) {
      this.scene.particleSystem.spawnTileDebris(this.x, this.y, 0xef4444, 12);
      this.scene.particleSystem.spawnTileDebris(this.x, this.y, 0xffffff, 8);
    }

    this.container.setVisible(false);

    if (this.scene.onPlayerDied) {
      this.scene.onPlayerDied();
    }
  }

  respawn(spawnX, spawnY) {
    this.x = spawnX;
    this.y = spawnY;
    this.vx = 0;
    this.vy = 0;
    this.hp = this.maxHp;
    this.shield = this.maxShield;
    this.isDead = false;
    this.isInvulnerable = true;
    this.invulnerableTimer = 1.5; // generous grace period
    this.container.setVisible(true);
    this.container.setAlpha(1);
    this.updateShieldVisual();
    this.syncHUD();
  }

  update(cursors, keys, pointer, delta) {
    if (this.isDead) return;

    // Invulnerability timer countdown & blinking
    if (this.isInvulnerable) {
      this.invulnerableTimer -= delta;
      if (this.invulnerableTimer <= 0) {
        this.isInvulnerable = false;
        this.invulnerableTimer = 0;
        this.container.setAlpha(1);
      } else {
        const blink = Math.sin(this.invulnerableTimer * 28) > 0 ? 0.35 : 1;
        this.container.setAlpha(blink);
      }
    }

    // Shield passive recharge
    if (this.shieldRechargeTimer > 0) {
      this.shieldRechargeTimer -= delta;
    } else if (this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + this.shieldRechargeRate * delta);
      this.updateShieldVisual();
      this.syncHUD();
    }

    // 1. Horizontal Movement (Keyboard OR Touch D-Pad)
    let moveDir = 0;
    if (cursors.left.isDown || keys.A.isDown || this.touchControls.left) moveDir -= 1;
    if (cursors.right.isDown || keys.D.isDown || this.touchControls.right) moveDir += 1;

    if (moveDir !== 0) {
      this.vx = moveDir * this.speed;
      this.facingRight = moveDir > 0;
    } else {
      this.vx *= 0.75; // ground friction
      if (Math.abs(this.vx) < 5) this.vx = 0;
    }

    // 2. Gravity
    this.vy += this.gravity * delta;

    // 3. Jump & Double Jump
    const jumpPressed = Phaser.Input.Keyboard.JustDown(cursors.up) ||
                        Phaser.Input.Keyboard.JustDown(keys.W) ||
                        Phaser.Input.Keyboard.JustDown(cursors.space) ||
                        this.touchControls.justJump;
    if (this.touchControls.justJump) {
      this.touchControls.justJump = false; // consume one-shot
    }

    const jumpHeld = cursors.up.isDown || keys.W.isDown || cursors.space.isDown || this.touchControls.up;

    if (jumpPressed) {
      if (this.onGround) {
        this.vy = this.jumpForce;
        this.onGround = false;
        this.canDoubleJump = true;
        SoundFX.jump();
      } else if (this.canDoubleJump) {
        this.vy = this.jumpForce * 0.9;
        this.canDoubleJump = false;
        this.isFlipping = true;
        SoundFX.doubleJump();
      }
    }

    // 4. Jetpack Flight (Holding Jump in Air)
    this.isJetpacking = false;
    if (!this.onGround && jumpHeld && this.vy > -200) {
      this.vy += this.jetpackForce * delta;
      this.isJetpacking = true;
      if (Math.random() > 0.3) {
        SoundFX.jetpack();
      }

      if (this.scene.particleSystem) {
        const jetpackX = this.x + (this.facingRight ? -8 : 8);
        const jetpackY = this.y + 4;
        this.scene.particleSystem.spawnJetpackSmoke(jetpackX, jetpackY);
      }
    }

    // 5. Drop-Through / Fast Fall (Pressing Down / S or Touch Down)
    if (cursors.down.isDown || keys.S.isDown || this.touchControls.down) {
      if (this.vy < 350) this.vy += 600 * delta;
    }

    // 6. Flip Animation
    if (this.isFlipping) {
      this.flipAngle += delta * 12;
      this.graphics.rotation = this.flipAngle;
      if (this.flipAngle >= Math.PI * 2) {
        this.isFlipping = false;
        this.flipAngle = 0;
        this.graphics.rotation = 0;
      }
    } else {
      this.graphics.rotation = 0;
    }

    // 7. Aim at Mouse Pointer or Touch Location
    const worldPoint = pointer.positionToCamera(this.scene.cameras.main);
    const aimAngle = Phaser.Math.Angle.Between(this.x, this.y, worldPoint.x, worldPoint.y);
    this.drawGun(aimAngle);

    // 8. Update Container Position
    this.container.setPosition(this.x, this.y);
  }

  getMuzzlePosition() {
    const barrelLen = 16;
    return {
      x: this.x + Math.cos(this.aimAngle) * barrelLen,
      y: this.y + Math.sin(this.aimAngle) * barrelLen,
      angle: this.aimAngle
    };
  }
}
