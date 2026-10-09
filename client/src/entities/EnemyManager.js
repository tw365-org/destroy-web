import Phaser from 'phaser';
import { SoundFX } from '../systems/SoundFX.js';

export class EnemyManager {
  constructor(scene) {
    this.scene = scene;
    this.minions = [];
    this.drones = [];
    this.foodDrops = [];
    this.enemyBullets = [];
    this.boss = null;

    this.spawnTimer = 0;
    this.spawnInterval = 3.5; // Spawn a minion or drone every 3.5s
    this.maxMinions = 8;
    this.maxDrones = 5;

    this.bossSpawned = false;
    this.bossDefeated = false;
  }

  initSpawns(count = 4) {
    const map = this.scene.destructibleMap;
    if (!map) return;

    // Scatter initial minions across the upper platforms of the webpage
    for (let i = 0; i < count; i++) {
      const spawnX = Phaser.Math.Between(150, map.width - 150);
      const spawnY = Phaser.Math.Between(200, Math.min(map.height - 200, 1000));
      this.spawnMinion(spawnX, spawnY);
    }

    // Spawn 2 initial drones
    this.spawnDrone(300, 250);
    this.spawnDrone(map.width - 300, 300);
  }

  // --- SPAWNING ---

  spawnMinion(x, y) {
    if (this.minions.length >= this.maxMinions) return;

    const container = this.scene.add.container(x, y);
    const gfx = this.scene.add.graphics();
    container.add(gfx);

    // Draw retro pixel cockroach / night market crawler
    gfx.fillStyle(0x78350f, 1); // Dark chitin shell
    gfx.fillRoundedRect(-12, -8, 24, 16, 4);
    gfx.fillStyle(0xb45309, 1);
    gfx.fillCircle(-8, -2, 4); // Head
    // Antennae
    gfx.lineStyle(2, 0xd97706, 1);
    gfx.lineBetween(-10, -4, -18, -12);
    gfx.lineBetween(-10, 0, -18, -6);
    // Legs
    gfx.lineBetween(-6, 8, -10, 14);
    gfx.lineBetween(0, 8, 0, 14);
    gfx.lineBetween(6, 8, 8, 14);

    const minion = {
      container,
      gfx,
      x,
      y,
      vx: Phaser.Math.RND.pick([-70, 70]),
      vy: 0,
      width: 24,
      height: 20,
      hp: 40,
      maxHp: 40,
      onGround: true,
      fallTime: 0,
      attackCooldown: 0,
      isFallingToDeath: false
    };

    this.minions.push(minion);
  }

  spawnDrone(x, y) {
    if (this.drones.length >= this.maxDrones) return;

    const container = this.scene.add.container(x, y);
    const gfx = this.scene.add.graphics();
    container.add(gfx);

    // Draw surveillance drone with glowing sensor eye
    gfx.fillStyle(0x334155, 1);
    gfx.fillRoundedRect(-14, -10, 28, 20, 5);
    // Rotor blades
    gfx.lineStyle(2, 0x94a3b8, 1);
    gfx.lineBetween(-18, -12, 18, -12);
    // Glowing red LED eye
    gfx.fillStyle(0xef4444, 1);
    gfx.fillCircle(0, 0, 5);

    const drone = {
      container,
      gfx,
      x,
      y,
      baseY: y,
      timeOffset: Math.random() * 10,
      vx: Phaser.Math.RND.pick([-80, 80]),
      vy: 0,
      width: 28,
      height: 20,
      hp: 30,
      maxHp: 30,
      fireTimer: Phaser.Math.FloatBetween(1.2, 2.5)
    };

    this.drones.push(drone);
  }

  spawnBoss() {
    if (this.bossSpawned || this.boss) return;
    this.bossSpawned = true;

    const map = this.scene.destructibleMap;
    const player = this.scene.player;
    const spawnX = player ? player.x : map.width / 2;
    const spawnY = Math.max(120, (player ? player.y : 300) - 250);

    const container = this.scene.add.container(spawnX, spawnY);
    const gfx = this.scene.add.graphics();
    container.add(gfx);

    this.drawBossGfx(gfx, false);

    SoundFX.bossSiren();
    this.scene.cameras.main.shake(400, 0.015);

    if (window.updateBossHUD) {
      window.updateBossHUD(1200, 1200, true, '🚨 夜市食安特級稽查長');
    }

    this.boss = {
      container,
      gfx,
      x: spawnX,
      y: spawnY,
      targetY: spawnY,
      width: 68,
      height: 68,
      hp: 1200,
      maxHp: 1200,
      phase: 1, // 1: Barrage & summon, 2: Enraged slam
      isEnraged: false,
      state: 'hover', // 'hover', 'windup', 'slam', 'recover'
      stateTimer: 0,
      attackTimer: 2.2,
      summonTimer: 5.0,
      slamTargetX: 0,
      slamTargetY: 0
    };
  }

  drawBossGfx(gfx, isEnraged) {
    gfx.clear();
    const primary = isEnraged ? 0xef4444 : 0x0f172a;
    const secondary = isEnraged ? 0xf59e0b : 0x38bdf8;
    const eye = isEnraged ? 0xffffff : 0xf43f5e;

    // Armor Chassis
    gfx.fillStyle(primary, 1);
    gfx.lineStyle(3, secondary, 1);
    gfx.fillRoundedRect(-32, -32, 64, 64, 10);
    gfx.strokeRoundedRect(-32, -32, 64, 64, 10);

    // Hazard Stripes
    gfx.fillStyle(secondary, 0.8);
    gfx.fillRect(-24, -20, 8, 40);
    gfx.fillRect(16, -20, 8, 40);

    // Badge / Food inspection crest
    gfx.fillStyle(eye, 1);
    gfx.fillCircle(0, 0, 14);
    gfx.lineStyle(2, 0xffffff, 1);
    gfx.strokeCircle(0, 0, 14);

    // Horns / Spikes
    gfx.fillStyle(secondary, 1);
    gfx.fillTriangle(-28, -32, -20, -32, -24, -44);
    gfx.fillTriangle(20, -32, 28, -32, 24, -44);
  }

  spawnFoodDrop(x, y) {
    const isBoba = Math.random() > 0.5;
    const type = isBoba ? 'boba' : 'chicken';
    const healAmount = isBoba ? 25 : 35;
    const color = isBoba ? 0x67e8f9 : 0xfbbf24;

    const container = this.scene.add.container(x, y);
    const gfx = this.scene.add.graphics();
    container.add(gfx);

    if (isBoba) {
      // 珍珠奶茶杯子
      gfx.fillStyle(0x38bdf8, 1);
      gfx.fillRoundedRect(-8, -12, 16, 24, 3);
      gfx.fillStyle(0x1e293b, 1);
      gfx.fillCircle(-3, 6, 2);
      gfx.fillCircle(3, 7, 2);
      gfx.fillCircle(0, 2, 2);
    } else {
      // 香酥金黃鹽酥雞
      gfx.fillStyle(0xf59e0b, 1);
      gfx.fillRoundedRect(-10, -8, 20, 16, 5);
      gfx.fillStyle(0x22c55e, 1); // 翠綠九層塔
      gfx.fillCircle(2, -2, 3);
    }

    this.foodDrops.push({
      container,
      type,
      amount: healAmount,
      x,
      y,
      vy: -140,
      lifetime: 14.0,
      age: 0
    });
  }

  spawnEnemyBullet(x, y, vx, vy, isLaser = false) {
    const size = isLaser ? 8 : 6;
    const color = isLaser ? 0xf43f5e : 0xec4899;
    const circle = this.scene.add.circle(x, y, size, color);

    this.enemyBullets.push({
      sprite: circle,
      x,
      y,
      vx,
      vy,
      radius: size,
      damage: isLaser ? 18 : 12,
      lifetime: 3.5,
      age: 0
    });
  }

  // --- UPDATE LOOP ---

  update(delta) {
    const map = this.scene.destructibleMap;
    const player = this.scene.player;
    if (!map) return;

    // 1. Spawning cycle for basic mobs
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      if (player) {
        const randX = Phaser.Math.Clamp(
          player.x + Phaser.Math.RND.pick([-450, 450]),
          100,
          map.width - 100
        );
        const randY = Math.max(150, player.y - 180);
        if (Math.random() > 0.45) {
          this.spawnMinion(randX, randY);
        } else {
          this.spawnDrone(randX, randY);
        }
      }
    }

    // 2. Update Ground Minions
    this.updateMinions(delta);

    // 3. Update Flying Drones
    this.updateDrones(delta);

    // 4. Update Boss
    this.updateBoss(delta);

    // 5. Update Enemy Projectiles
    this.updateEnemyBullets(delta);

    // 6. Update Food Pickups
    this.updateFoodDrops(delta);
  }

  updateMinions(delta) {
    const map = this.scene.destructibleMap;
    const player = this.scene.player;

    for (let i = this.minions.length - 1; i >= 0; i--) {
      const m = this.minions[i];

      // Gravity
      m.vy += 950 * delta;
      m.x += m.vx * delta;
      m.y += m.vy * delta;

      // Check foot tile for ground / environmental fall
      const footCol = Math.floor(m.x / map.tileSize);
      const footRow = Math.floor((m.y + m.height / 2 + 2) / map.tileSize);
      const hasFloor = map.isSolid(footCol, footRow);

      if (hasFloor && m.vy > 0) {
        // Land on tile
        m.y = footRow * map.tileSize - m.height / 2;
        m.vy = 0;
        m.onGround = true;

        // Check ahead for wall or cliff
        const aheadCol = Math.floor((m.x + Math.sign(m.vx) * (m.width / 2 + 6)) / map.tileSize);
        const wallAhead = map.isSolid(aheadCol, Math.floor(m.y / map.tileSize));
        const floorAhead = map.isSolid(aheadCol, footRow);

        if (wallAhead || !floorAhead) {
          m.vx *= -1; // Turn around at edge or wall
        }
      } else if (!hasFloor) {
        m.onGround = false;
        // If falling down into bedrock or deep hole at high speed -> Environmental Hazard Kill!
        if (m.y >= map.height - 40 || m.y >= map.height - m.height) {
          // Splat on bottom void
          if (this.scene.scoreManager) {
            this.scene.scoreManager.registerEnemyKill('environmental', m.x, m.y);
          }
          if (this.scene.particleSystem) {
            this.scene.particleSystem.spawnTileDebris(m.x, m.y, 0x78350f, 10);
          }
          if (Math.random() < 0.45) {
            this.spawnFoodDrop(m.x, m.y - 15);
          }

          m.container.destroy();
          this.minions.splice(i, 1);
          continue;
        }
      }

      // Melee attack check against player
      if (player && !player.isDead && m.attackCooldown <= 0) {
        const dist = Phaser.Math.Distance.Between(m.x, m.y, player.x, player.y);
        if (dist < 32) {
          player.takeDamage(14, m.x, m.y);
          m.attackCooldown = 1.2;
        }
      } else if (m.attackCooldown > 0) {
        m.attackCooldown -= delta;
      }

      m.container.setPosition(m.x, m.y);
    }
  }

  updateDrones(delta) {
    const player = this.scene.player;

    for (let i = this.drones.length - 1; i >= 0; i--) {
      const d = this.drones[i];

      // Sinusoidal bobbing
      d.timeOffset += delta;
      const targetY = player ? player.y - 120 + Math.sin(d.timeOffset * 2.5) * 45 : d.baseY;
      d.y += (targetY - d.y) * 2.0 * delta;

      // Track player horizontally, keep stand-off distance
      if (player) {
        const dx = player.x - d.x;
        if (Math.abs(dx) > 180) {
          d.vx = Math.sign(dx) * 110;
        } else if (Math.abs(dx) < 100) {
          d.vx = -Math.sign(dx) * 80;
        } else {
          d.vx *= 0.9;
        }
      }

      d.x += d.vx * delta;
      d.container.setPosition(d.x, d.y);

      // Firing bullets at player
      d.fireTimer -= delta;
      if (d.fireTimer <= 0 && player && !player.isDead) {
        d.fireTimer = Phaser.Math.FloatBetween(2.2, 3.2);
        const angle = Phaser.Math.Angle.Between(d.x, d.y, player.x, player.y);
        const speed = 260;
        this.spawnEnemyBullet(d.x, d.y + 6, Math.cos(angle) * speed, Math.sin(angle) * speed);
        SoundFX.enemyHit();
      }
    }
  }

  updateBoss(delta) {
    if (!this.boss || this.bossDefeated) return;
    const b = this.boss;
    const player = this.scene.player;
    const map = this.scene.destructibleMap;

    // Phase transition check (at 50% HP)
    if (b.hp <= b.maxHp * 0.5 && !b.isEnraged) {
      b.isEnraged = true;
      b.phase = 2;
      this.drawBossGfx(b.gfx, true);
      SoundFX.bossSiren();
      this.scene.cameras.main.shake(300, 0.012);
      if (this.scene.scoreManager) {
        this.scene.scoreManager.showFloatingText(b.x, b.y - 40, '⚡ 稽查長暴走狂暴態！！', 0xef4444);
      }
    }

    if (b.state === 'hover') {
      // Hovering above player
      if (player) {
        const targetX = player.x;
        const targetY = Math.max(100, player.y - (b.isEnraged ? 180 : 230));
        b.x += (targetX - b.x) * (b.isEnraged ? 3.5 : 2.0) * delta;
        b.y += (targetY - b.y) * 2.5 * delta;
      }

      // Attack firing
      b.attackTimer -= delta;
      if (b.attackTimer <= 0) {
        b.attackTimer = b.isEnraged ? 1.6 : 2.5;

        if (b.isEnraged && Math.random() > 0.4) {
          // Prepare ground pound slam attack
          b.state = 'windup';
          b.stateTimer = 0.5;
          b.slamTargetX = player ? player.x : b.x;
          b.slamTargetY = player ? player.y : b.y + 300;
        } else {
          // 3-way spread or laser barrage
          if (player && !player.isDead) {
            const baseAngle = Phaser.Math.Angle.Between(b.x, b.y, player.x, player.y);
            const spreadAngles = [-0.22, 0, 0.22];
            spreadAngles.forEach(off => {
              const ang = baseAngle + off;
              const spd = b.isEnraged ? 380 : 300;
              this.spawnEnemyBullet(b.x, b.y, Math.cos(ang) * spd, Math.sin(ang) * spd, true);
            });
            SoundFX.enemyHit();
          }
        }
      }

      // Minion summoning
      b.summonTimer -= delta;
      if (b.summonTimer <= 0) {
        b.summonTimer = b.isEnraged ? 5.5 : 7.0;
        this.spawnDrone(b.x - 60, b.y);
        this.spawnDrone(b.x + 60, b.y);
      }

    } else if (b.state === 'windup') {
      b.stateTimer -= delta;
      // Slight rise and telegraph shudder
      b.y -= 40 * delta;
      b.container.setRotation((Math.random() - 0.5) * 0.25);

      if (b.stateTimer <= 0) {
        b.state = 'slam';
        b.container.setRotation(0);
      }

    } else if (b.state === 'slam') {
      // Rapid plunge downward
      b.y += 980 * delta;

      // Check collision with destructible terrain or bottom
      const col = Math.floor(b.x / map.tileSize);
      const row = Math.floor((b.y + b.height / 2) / map.tileSize);
      const hitTerrain = map.isSolid(col, row);

      if (hitTerrain || b.y >= map.height - 80) {
        // SLAM IMPACT!
        SoundFX.bossSlam();
        this.scene.cameras.main.shake(320, 0.016);

        // Crater destruction!
        map.damageAt(b.x, b.y + 10, 75);

        // Shockwave particles
        if (this.scene.particleSystem) {
          this.scene.particleSystem.spawnExplosionShockwave(b.x, b.y, 80, 0xef4444);
          this.scene.particleSystem.spawnTileDebris(b.x, b.y, 0xf59e0b, 16);
        }

        // Damage player if caught in crater
        if (player && !player.isDead) {
          const pDist = Phaser.Math.Distance.Between(b.x, b.y, player.x, player.y);
          if (pDist < 90) {
            player.takeDamage(28, b.x, b.y);
          }
        }

        b.state = 'recover';
        b.stateTimer = 0.6;
      }

    } else if (b.state === 'recover') {
      b.stateTimer -= delta;
      if (b.stateTimer <= 0) {
        b.state = 'hover';
        b.attackTimer = 1.5;
      }
    }

    b.container.setPosition(b.x, b.y);

    // Sync Boss HP to HUD
    if (window.updateBossHUD) {
      window.updateBossHUD(b.hp, b.maxHp, true, b.isEnraged ? '🔥【暴走】食安特級稽查長' : '🚨 夜市食安特級稽查長');
    }
  }

  updateEnemyBullets(delta) {
    const map = this.scene.destructibleMap;
    const player = this.scene.player;

    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.age += delta;
      b.x += b.vx * delta;
      b.y += b.vy * delta;
      b.sprite.setPosition(b.x, b.y);

      // Terrain hit
      const col = Math.floor(b.x / map.tileSize);
      const row = Math.floor(b.y / map.tileSize);
      const hitTerrain = map.isSolid(col, row);

      // Player hit
      let hitPlayer = false;
      if (player && !player.isDead) {
        const dist = Phaser.Math.Distance.Between(b.x, b.y, player.x, player.y);
        if (dist < b.radius + 14) {
          player.takeDamage(b.damage, b.x, b.y);
          hitPlayer = true;
        }
      }

      if (hitTerrain || hitPlayer || b.age >= b.lifetime) {
        b.sprite.destroy();
        this.enemyBullets.splice(i, 1);
      }
    }
  }

  updateFoodDrops(delta) {
    const player = this.scene.player;

    for (let i = this.foodDrops.length - 1; i >= 0; i--) {
      const f = this.foodDrops[i];
      f.age += delta;

      // Float / fall gently
      if (f.vy < 120) f.vy += 300 * delta;
      f.y += f.vy * delta;

      // Magnet toward player if within 85px
      if (player && !player.isDead) {
        const dist = Phaser.Math.Distance.Between(f.x, f.y, player.x, player.y);
        if (dist < 85) {
          f.x += (player.x - f.x) * 6.5 * delta;
          f.y += (player.y - f.y) * 6.5 * delta;

          if (dist < 26) {
            player.heal(f.amount);
            f.container.destroy();
            this.foodDrops.splice(i, 1);
            continue;
          }
        }
      }

      f.container.setPosition(f.x, f.y);

      if (f.age >= f.lifetime) {
        f.container.destroy();
        this.foodDrops.splice(i, 1);
      }
    }
  }

  // --- COLLISION / DAMAGE HANDLING ---

  checkBulletHit(bullet) {
    // 1. Check Boss
    if (this.boss && !this.bossDefeated) {
      const b = this.boss;
      const dist = Phaser.Math.Distance.Between(bullet.x, bullet.y, b.x, b.y);
      if (dist < b.width / 2 + (bullet.radius || 10)) {
        const dmg = bullet.isNuke ? 260 : (bullet.isExplosive ? 75 : 18);
        this.damageBoss(dmg, bullet.x, bullet.y);
        return true;
      }
    }

    // 2. Check Drones
    for (let i = this.drones.length - 1; i >= 0; i--) {
      const d = this.drones[i];
      const dist = Phaser.Math.Distance.Between(bullet.x, bullet.y, d.x, d.y);
      if (dist < d.width / 2 + (bullet.radius || 8)) {
        const dmg = bullet.isNuke ? 260 : (bullet.isExplosive ? 60 : 20);
        d.hp -= dmg;
        SoundFX.enemyHit();

        if (this.scene.particleSystem) {
          this.scene.particleSystem.spawnTileDebris(d.x, d.y, 0xef4444, 4);
        }

        if (d.hp <= 0) {
          SoundFX.enemyExplosion();
          if (this.scene.scoreManager) {
            this.scene.scoreManager.registerEnemyKill('drone', d.x, d.y);
          }
          if (Math.random() < 0.38) {
            this.spawnFoodDrop(d.x, d.y);
          }
          d.container.destroy();
          this.drones.splice(i, 1);
        }
        return true;
      }
    }

    // 3. Check Minions
    for (let i = this.minions.length - 1; i >= 0; i--) {
      const m = this.minions[i];
      const dist = Phaser.Math.Distance.Between(bullet.x, bullet.y, m.x, m.y);
      if (dist < m.width / 2 + (bullet.radius || 8)) {
        const dmg = bullet.isNuke ? 260 : (bullet.isExplosive ? 60 : 22);
        m.hp -= dmg;
        SoundFX.enemyHit();

        if (this.scene.particleSystem) {
          this.scene.particleSystem.spawnTileDebris(m.x, m.y, 0x78350f, 4);
        }

        if (m.hp <= 0) {
          SoundFX.enemyExplosion();
          if (this.scene.scoreManager) {
            this.scene.scoreManager.registerEnemyKill('minion', m.x, m.y);
          }
          if (Math.random() < 0.40) {
            this.spawnFoodDrop(m.x, m.y);
          }
          m.container.destroy();
          this.minions.splice(i, 1);
        }
        return true;
      }
    }

    return false;
  }

  damageBoss(dmg, hitX, hitY) {
    if (!this.boss || this.bossDefeated) return;
    const b = this.boss;
    b.hp = Math.max(0, b.hp - dmg);
    SoundFX.enemyHit();

    if (this.scene.particleSystem) {
      this.scene.particleSystem.spawnTileDebris(hitX, hitY, 0xf59e0b, 6);
    }

    if (b.hp <= 0) {
      this.bossDefeated = true;
      SoundFX.explosion(3.0);
      SoundFX.enemyExplosion();

      if (this.scene.cameras.main) {
        this.scene.cameras.main.shake(600, 0.02);
      }

      if (this.scene.scoreManager) {
        this.scene.scoreManager.registerEnemyKill('boss', b.x, b.y);
      }

      // Drop feast of food items
      for (let k = 0; k < 5; k++) {
        this.spawnFoodDrop(b.x + (k - 2) * 25, b.y);
      }

      if (window.updateBossHUD) {
        window.updateBossHUD(0, b.maxHp, false, '');
      }

      b.container.destroy();
      this.boss = null;
    }
  }

  checkLaserHit(x1, y1, x2, y2) {
    const line = new Phaser.Geom.Line(x1, y1, x2, y2);

    // Laser vs Boss
    if (this.boss && !this.bossDefeated) {
      const circle = new Phaser.Geom.Circle(this.boss.x, this.boss.y, this.boss.width / 2);
      if (Phaser.Geom.Intersects.LineToCircle(line, circle)) {
        this.damageBoss(25, this.boss.x, this.boss.y);
      }
    }

    // Laser vs Drones
    for (let i = this.drones.length - 1; i >= 0; i--) {
      const d = this.drones[i];
      const circle = new Phaser.Geom.Circle(d.x, d.y, d.width / 2);
      if (Phaser.Geom.Intersects.LineToCircle(line, circle)) {
        d.hp -= 25;
        SoundFX.enemyHit();
        if (d.hp <= 0) {
          SoundFX.enemyExplosion();
          if (this.scene.scoreManager) {
            this.scene.scoreManager.registerEnemyKill('drone', d.x, d.y);
          }
          d.container.destroy();
          this.drones.splice(i, 1);
        }
      }
    }

    // Laser vs Minions
    for (let i = this.minions.length - 1; i >= 0; i--) {
      const m = this.minions[i];
      const circle = new Phaser.Geom.Circle(m.x, m.y, m.width / 2);
      if (Phaser.Geom.Intersects.LineToCircle(line, circle)) {
        m.hp -= 25;
        SoundFX.enemyHit();
        if (m.hp <= 0) {
          SoundFX.enemyExplosion();
          if (this.scene.scoreManager) {
            this.scene.scoreManager.registerEnemyKill('minion', m.x, m.y);
          }
          m.container.destroy();
          this.minions.splice(i, 1);
        }
      }
    }
  }
}
