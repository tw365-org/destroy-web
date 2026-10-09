import { SoundFX } from '../systems/SoundFX.js';

export const WEAPON_TYPES = [
  { id: 'pig_blood_cake', name: '豬血糕', subtitle: '插籤連射', key: '1', cooldown: 90 },
  { id: 'pig_ear', name: '豬耳朵', subtitle: '脆片散彈', key: '2', cooldown: 450 },
  { id: 'stinky_tofu', name: '臭豆腐', subtitle: '毒氣重砲', key: '3', cooldown: 650 },
  { id: 'century_egg', name: '皮蛋', subtitle: '硫磺高爆', key: '4', cooldown: 750 },
  { id: 'braised_intestine', name: '滷大腸', subtitle: '穿透射線', key: '5', cooldown: 70 },
  { id: 'pig_tail', name: '豬尾巴', subtitle: '終極核彈', key: '6', cooldown: 1800 }
];

export class WeaponManager {
  constructor(scene) {
    this.scene = scene;
    this.weapons = WEAPON_TYPES;
    this.currentWeaponIndex = 0;
    this.lastFiredTime = 0;

    this.projectiles = [];
  }

  getCurrentWeapon() {
    return this.weapons[this.currentWeaponIndex];
  }

  selectWeapon(index) {
    if (index >= 0 && index < this.weapons.length && index !== this.currentWeaponIndex) {
      this.currentWeaponIndex = index;
      SoundFX.switchWeapon();
      if (this.scene.onWeaponChanged) {
        this.scene.onWeaponChanged(this.getCurrentWeapon(), this.currentWeaponIndex);
      }
    }
  }

  nextWeapon() {
    const nextIdx = (this.currentWeaponIndex + 1) % this.weapons.length;
    this.selectWeapon(nextIdx);
  }

  prevWeapon() {
    const prevIdx = (this.currentWeaponIndex - 1 + this.weapons.length) % this.weapons.length;
    this.selectWeapon(prevIdx);
  }

  tryFire(player, time) {
    const weapon = this.getCurrentWeapon();
    if (time - this.lastFiredTime < weapon.cooldown) return;

    this.lastFiredTime = time;
    const muzzle = player.getMuzzlePosition();

    switch (weapon.id) {
      case 'pig_blood_cake':
        this.firePigBloodCake(muzzle);
        break;
      case 'pig_ear':
        this.firePigEar(muzzle);
        break;
      case 'stinky_tofu':
        this.fireStinkyTofu(muzzle);
        break;
      case 'century_egg':
        this.fireCenturyEgg(muzzle);
        break;
      case 'braised_intestine':
        this.fireBraisedIntestine(muzzle);
        break;
      case 'pig_tail':
        this.firePigTail(muzzle);
        break;
    }
  }

  // 1. 豬血糕：插籤連射 (高速黑色長條血糕磚，夾帶花生粉與香菜碎屑)
  firePigBloodCake(muzzle) {
    SoundFX.shootSMG();
    const spread = (Math.random() - 0.5) * 0.08;
    const angle = muzzle.angle + spread;
    const speed = 1150;

    this.spawnBullet(muzzle.x, muzzle.y, Math.cos(angle) * speed, Math.sin(angle) * speed, {
      foodType: 'pig_blood_cake',
      radius: 15,
      color: 0x1f140e, // 濃郁豬血糕黑褐色
      sizeW: 7,
      sizeH: 4,
      rotation: angle,
      lifetime: 1.2
    });
  }

  // 2. 豬耳朵：脆片散彈 (6 片薄脆晶瑩的琥珀色耳絲飛刃，扇形噴射)
  firePigEar(muzzle) {
    SoundFX.shootShotgun();
    const pelletCount = 6;
    for (let i = 0; i < pelletCount; i++) {
      const spread = (Math.random() - 0.5) * 0.30;
      const angle = muzzle.angle + spread;
      const speed = Phaser.Math.Between(880, 1150);

      this.spawnBullet(muzzle.x, muzzle.y, Math.cos(angle) * speed, Math.sin(angle) * speed, {
        foodType: 'pig_ear',
        radius: 13,
        color: 0xd97706, // 琥珀熟成滷耳絲
        sizeW: 6,
        sizeH: 3,
        rotation: angle,
        lifetime: 0.85
      });
    }
    this.scene.cameras.main.shake(80, 0.004);
  }

  // 3. 臭豆腐：毒氣重砲 (外酥內嫩金黃方塊火箭，冒出惡臭綠毒瓦斯煙霧)
  fireStinkyTofu(muzzle) {
    SoundFX.shootRocket();
    const speed = 660;
    this.spawnBullet(muzzle.x, muzzle.y, Math.cos(muzzle.angle) * speed, Math.sin(muzzle.angle) * speed, {
      foodType: 'stinky_tofu',
      radius: 52,
      isExplosive: true,
      hasStink: true,
      color: 0xeab308, // 炸得金黃酥脆的臭豆腐方塊
      sizeW: 10,
      sizeH: 10,
      lifetime: 2.5
    });
    this.scene.cameras.main.shake(120, 0.006);
  }

  // 4. 皮蛋：硫磺高爆 (黑亮膠質皮蛋手榴彈，落地彈跳兩次後爆開黑綠蛋黃)
  fireCenturyEgg(muzzle) {
    SoundFX.shootGrenade();
    const speed = 540;
    this.spawnBullet(muzzle.x, muzzle.y, Math.cos(muzzle.angle) * speed, Math.sin(muzzle.angle) * speed - 60, {
      foodType: 'century_egg',
      radius: 68,
      gravity: 800,
      bounce: 0.55,
      isExplosive: true,
      color: 0x064e3b, // 皮蛋深邃黑綠玉色
      sizeW: 10,
      sizeH: 12,
      lifetime: 1.8
    });
  }

  // 5. 滷大腸：彈性穿透光束 (噴出高壓油亮滷汁大腸射線，直接貫穿任何網頁牆面)
  fireBraisedIntestine(muzzle) {
    SoundFX.shootLaser();
    const rayLength = 580;
    const endX = muzzle.x + Math.cos(muzzle.angle) * rayLength;
    const endY = muzzle.y + Math.sin(muzzle.angle) * rayLength;

    // 濃郁滷汁高壓射線
    const line = this.scene.add.line(0, 0, muzzle.x, muzzle.y, endX, endY, 0x92400e, 1);
    line.setLineWidth(5);
    line.setOrigin(0, 0);

    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: 110,
      onComplete: () => line.destroy()
    });

    // Check hit against enemies and Boss
    if (this.scene.enemyManager) {
      this.scene.enemyManager.checkLaserHit(muzzle.x, muzzle.y, endX, endY);
    }

    // 貫穿並在沿途噴發滷大腸香氣衝擊波
    const steps = 18;
    for (let i = 1; i <= steps; i++) {
      const stepDist = (rayLength / steps) * i;
      const hitX = muzzle.x + Math.cos(muzzle.angle) * stepDist;
      const hitY = muzzle.y + Math.sin(muzzle.angle) * stepDist;

      const col = Math.floor(hitX / this.scene.destructibleMap.tileSize);
      const row = Math.floor(hitY / this.scene.destructibleMap.tileSize);

      if (this.scene.destructibleMap.isSolid(col, row)) {
        this.scene.destructibleMap.damageAt(hitX, hitY, 18);
        this.scene.particleSystem.spawnExplosionShockwave(hitX, hitY, 20, 0xb45309);
        break;
      }
    }
  }

  // 6. 豬尾巴：終極旋風核彈 (超重型螺旋迴旋豬尾巴，觸發毀滅性大地震)
  firePigTail(muzzle) {
    SoundFX.shootNuke();
    const speed = 340;
    this.spawnBullet(muzzle.x, muzzle.y, Math.cos(muzzle.angle) * speed, Math.sin(muzzle.angle) * speed, {
      foodType: 'pig_tail',
      radius: 120,
      isExplosive: true,
      isNuke: true,
      hasSmoke: true,
      color: 0xf472b6, // 粉嫩捲曲豬尾巴
      sizeW: 16,
      sizeH: 16,
      lifetime: 3.5
    });
    this.scene.cameras.main.shake(260, 0.012);
  }

  spawnBullet(x, y, vx, vy, options = {}) {
    const sizeW = options.sizeW || 5;
    const sizeH = options.sizeH || 5;
    const rect = this.scene.add.rectangle(x, y, sizeW, sizeH, options.color || 0xffffff);

    if (options.rotation) {
      rect.rotation = options.rotation;
    }

    this.projectiles.push({
      sprite: rect,
      foodType: options.foodType || 'normal',
      x: x,
      y: y,
      vx: vx,
      vy: vy,
      gravity: options.gravity || 0,
      bounce: options.bounce || 0,
      radius: options.radius || 16,
      isExplosive: options.isExplosive || false,
      isNuke: options.isNuke || false,
      hasSmoke: options.hasSmoke || false,
      hasStink: options.hasStink || false,
      lifetime: options.lifetime || 1.5,
      age: 0
    });
  }

  update(delta) {
    const map = this.scene.destructibleMap;
    if (!map) return;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.age += delta;

      // Apply Gravity
      if (p.gravity) {
        p.vy += p.gravity * delta;
      }

      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.sprite.setPosition(p.x, p.y);

      // 特殊美食尾跡粒子
      if (p.foodType === 'pig_blood_cake' && Math.random() > 0.4) {
        // 豬血糕噴灑花生粉與香菜
        this.scene.particleSystem.spawnPeanutCilantroDebris(p.x, p.y);
      } else if (p.hasStink && Math.random() > 0.3) {
        // 臭豆腐冒出綠色惡臭毒煙
        this.scene.particleSystem.spawnStinkyGas(p.x, p.y);
      } else if (p.hasSmoke && Math.random() > 0.4) {
        // 豬尾巴螺旋衝刺煙霧
        this.scene.particleSystem.spawnJetpackSmoke(p.x, p.y);
      }

      // Check collision with enemies (Ground Minions, Drones, Boss)
      let hitEnemy = false;
      if (this.scene.enemyManager && this.scene.enemyManager.checkBulletHit(p)) {
        hitEnemy = true;
      }

      // Check collision with solid tiles
      const col = Math.floor(p.x / map.tileSize);
      const row = Math.floor(p.y / map.tileSize);
      const hitSolid = map.isSolid(col, row);

      const outOfBounds = p.x < 0 || p.x > map.width || p.y < 0 || p.y > map.height;
      const expired = p.age >= p.lifetime;

      if (hitEnemy || hitSolid || outOfBounds || expired) {
        if (hitEnemy || hitSolid || p.isExplosive) {
          // Detonate / Damage Map
          map.damageAt(p.x, p.y, p.radius);

          if (p.foodType === 'pig_tail') {
            SoundFX.explosion(2.6);
            this.scene.particleSystem.spawnPigTailShockwave(p.x, p.y, p.radius);
          } else if (p.foodType === 'century_egg') {
            SoundFX.explosion(1.4);
            this.scene.particleSystem.spawnCenturyEggSplatter(p.x, p.y, 10);
            this.scene.particleSystem.spawnExplosionShockwave(p.x, p.y, p.radius, 0x064e3b);
          } else if (p.foodType === 'stinky_tofu') {
            SoundFX.explosion(1.3);
            this.scene.particleSystem.spawnExplosionShockwave(p.x, p.y, p.radius, 0x84cc16);
            for (let k = 0; k < 6; k++) {
              this.scene.particleSystem.spawnStinkyGas(p.x + (Math.random() - 0.5) * 40, p.y + (Math.random() - 0.5) * 40);
            }
          } else {
            SoundFX.tileHit();
          }
        }

        p.sprite.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }
}
