# 💥 Destroy-Web: Destroy Any Website

> An interactive 2D web arcade shooter inspired by [Sprite Fusion's Destroy Any Website](https://destroy.spritefusion.com/).
> Enter any URL on the internet, and watch it transform into a destructible pixel-art battlefield where you blast through text, images, and containers with an explosive weapon arsenal!

---

## 🎮 Features

- **🌐 Any URL into a Battleground**: Enter any website address (or select from built-in presets like *Wikipedia* or *Demo Arena*). The headless Chromium backend rasterizes the page into high-resolution terrain.
- **💥 Real-time Destructible Terrain**: Carve craters and drill tunnels directly through HTML content, headers, and images using WebGL render textures and spatial collision masking.
- **🕹️ Stickman Jetpack Physics**:
  - Run (`A` / `D` or Arrow keys)
  - Jump & Mid-air somersault flips (`Space` or `W`)
  - Hold `Space` in mid-air to ignite **jetpack thrusters** and fly across the page
  - Drop down through breached floors (`S` or Down arrow)
  - 360-degree mouse aiming
- **🔫 6 Destructive Weapons**:
  - **[1] SMG**: High fire rate, rapid precision tunneling
  - **[2] SHOTGUN**: 6-pellet high spread breach-and-clear
  - **[3] ROCKET LAUNCHER**: Ballistic rockets with massive crater explosions
  - **[4] GRENADE**: Bouncing fuse grenades with wide blast radii
  - **[5] LASER CANNON**: Piercing continuous beam ray
  - **[6] MINI-NUKE**: Screen-clearing cataclysmic ordnance
- **🔊 Procedural 8-bit Audio (ZzFX)**: 100% synthesized real-time sound effects via the Web Audio API with zero external asset latency.
- **🖥️ Retro OS Dark Window UI**: 90s beveled desktop frame with live destruction percentage meter (`0% - 100%`), weapon selector, and milestone demolition reports.
- **🛡️ SSRF Protected & Cached**: Headless scraper blocks private IP ranges, loops, and dangerous protocols while caching rendered levels on disk for instantaneous repeat play.

---

## 🚀 Quick Start

### 1. Start Both Backend & Frontend
```bash
cd /root/sh/agy/destroy-web
npm run dev
```

Or run separately:
```bash
# Terminal 1: Backend Server (Port 3001)
npm run server

# Terminal 2: Frontend Client (Port 3000)
npm run client
```

Open `http://localhost:3000` in your web browser!

---

## 🕹️ Controls

| Action | Keys |
| :--- | :--- |
| **Move Left / Right** | `A` / `D` or `Left` / `Right` Arrow |
| **Jump / Air Flip** | `Space` / `W` / `Up` Arrow |
| **Jetpack Flight** | **Hold `Space`** in mid-air |
| **Drop Down** | `S` or `Down` Arrow |
| **Aim** | Mouse cursor |
| **Shoot** | **Left Click** |
| **Quick Grenade** | **Right Click** |
| **Switch Weapons** | Keys `1` through `6` or Mouse Wheel |

---

## 🏗️ Architecture

```
destroy-web/
├── server/
│   ├── server.js        # Express REST API (/api/rasterize, /api/presets)
│   ├── scraper.js       # Headless Chromium rasterizer (Puppeteer)
│   ├── security.js      # SSRF validation & protocol filter
│   ├── cache.js         # Disk level cache (.cache/levels/)
│   └── presets/         # Built-in demo presets (demo.html, etc.)
├── client/
│   ├── index.html       # Retro window UI frame & HUD
│   ├── vite.config.js   # Vite dev & build configuration
│   └── src/
│       ├── main.js      # Phaser bootstrap & UI binding
│       ├── scenes/
│       │   └── GameScene.js # Camera, input loop, physics orchestration
│       ├── entities/
│       │   ├── Player.js    # Stickman controller & jetpack
│       │   └── WeaponManager.js # 6 weapons, ballistics & projectiles
│       ├── systems/
│       │   ├── DestructibleMap.js # Render texture carving & AABB solver
│       │   ├── ParticleSystem.js  # Debris & explosion shockwaves
│       │   └── SoundFX.js         # ZzFX procedural Web Audio
│       └── styles/
│           └── retro-ui.css # 90s dark theme desktop styles
└── test-e2e.js          # Headless Puppeteer integration test suite
```
