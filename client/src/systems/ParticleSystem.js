export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.debrisParticles = [];
  }

  // Spawn shattered pixel fragments matching tile color
  spawnTileDebris(x, y, colorHex = 0xffffff, count = 3) {
    for (let i = 0; i < count; i++) {
      const size = Phaser.Math.Between(3, 6);
      const rect = this.scene.add.rectangle(
        x + Phaser.Math.Between(-4, 4),
        y + Phaser.Math.Between(-4, 4),
        size,
        size,
        colorHex
      );

      this.scene.physics.add.existing(rect);
      const body = rect.body;
      body.setCollideWorldBounds(true);
      body.setBounce(0.3);

      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.Between(80, 260);
      body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed - 60);
      body.setGravityY(700);

      this.scene.tweens.add({
        targets: rect,
        alpha: 0,
        rotation: (Math.random() - 0.5) * 6,
        duration: Phaser.Math.Between(400, 800),
        onComplete: () => {
          rect.destroy();
        }
      });
    }
  }

  // 豬血糕專屬：花生粉 (黃) 與香菜 (綠) 碎屑軌跡
  spawnPeanutCilantroDebris(x, y) {
    const isCilantro = Math.random() > 0.6;
    const color = isCilantro ? 0x22c55e : 0xf59e0b; // 鮮綠香菜 或 金黃花生粉
    const size = Phaser.Math.Between(3, 5);

    const particle = this.scene.add.rectangle(x, y, size, size, color);
    this.scene.physics.add.existing(particle);

    const body = particle.body;
    body.setVelocity(
      (Math.random() - 0.5) * 60,
      Phaser.Math.Between(-30, 60)
    );
    body.setGravityY(300);

    this.scene.tweens.add({
      targets: particle,
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: 400,
      onComplete: () => particle.destroy()
    });
  }

  // 臭豆腐專屬：惡臭綠色煙霧與毒氣瓦斯
  spawnStinkyGas(x, y) {
    const color = Math.random() > 0.4 ? 0x84cc16 : 0xa3e635; // 幽暗臭豆腐臭氣綠
    const size = Phaser.Math.Between(6, 12);

    const particle = this.scene.add.circle(x, y, size / 2, color, 0.7);
    this.scene.physics.add.existing(particle);

    const body = particle.body;
    body.setVelocity(
      (Math.random() - 0.5) * 50,
      Phaser.Math.Between(-40, 20)
    );

    this.scene.tweens.add({
      targets: particle,
      alpha: 0,
      scaleX: 1.8,
      scaleY: 1.8,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => particle.destroy()
    });
  }

  // 皮蛋專屬：黑色膠質與濃稠暗色蛋黃濺射
  spawnCenturyEggSplatter(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const isYolk = Math.random() > 0.5;
      const color = isYolk ? 0x064e3b : 0x0f172a; // 深墨綠濃稠蛋黃 or 黑色果凍皮
      const size = Phaser.Math.Between(4, 8);

      const drop = this.scene.add.circle(x, y, size / 2, color, 0.9);
      this.scene.physics.add.existing(drop);

      const body = drop.body;
      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.Between(100, 280);
      body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      body.setGravityY(600);

      this.scene.tweens.add({
        targets: drop,
        alpha: 0,
        scaleX: 0.4,
        scaleY: 0.4,
        duration: Phaser.Math.Between(400, 700),
        onComplete: () => drop.destroy()
      });
    }
  }

  // 豬尾巴專屬：粉嫩與醬汁色螺旋旋風衝擊波
  spawnPigTailShockwave(x, y, radius = 120) {
    const shockwave = this.scene.add.circle(x, y, 12, 0xf472b6, 0.85); // 豬尾粉嫩色
    shockwave.setStrokeStyle(5, 0xb45309); // 滷汁深色外框

    this.scene.tweens.add({
      targets: shockwave,
      radius: radius,
      alpha: 0,
      duration: 350,
      ease: 'Cubic.easeOut',
      onComplete: () => shockwave.destroy()
    });

    this.scene.cameras.main.shake(280, 0.015);
  }

  // Jetpack flame & smoke exhaust
  spawnJetpackSmoke(x, y) {
    const isFlame = Math.random() > 0.4;
    const color = isFlame
      ? (Math.random() > 0.5 ? 0xff7700 : 0xffcc00)
      : 0x64748b;
    const size = Phaser.Math.Between(4, 7);

    const particle = this.scene.add.rectangle(x, y, size, size, color);
    this.scene.physics.add.existing(particle);

    const body = particle.body;
    body.setVelocity(
      (Math.random() - 0.5) * 40,
      Phaser.Math.Between(60, 160)
    );

    this.scene.tweens.add({
      targets: particle,
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: 350,
      onComplete: () => {
        particle.destroy();
      }
    });
  }

  // Blast crater shockwave ring
  spawnExplosionShockwave(x, y, radius = 40, color = 0xffaa00) {
    const circle = this.scene.add.circle(x, y, 6, color, 0.8);
    circle.setStrokeStyle(3, 0xffffff);

    this.scene.tweens.add({
      targets: circle,
      radius: radius,
      alpha: 0,
      duration: 250,
      ease: 'Quad.easeOut',
      onComplete: () => {
        circle.destroy();
      }
    });

    // Camera shake
    this.scene.cameras.main.shake(150, Math.min(0.015, radius * 0.0003));
  }
}
