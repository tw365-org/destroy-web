export class DestructibleMap {
  constructor(scene, width, height, tileSize = 16) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
    this.cols = Math.ceil(width / tileSize);
    this.rows = Math.ceil(height / tileSize);

    // 2D grid: 1 = solid, 0 = destroyed/empty
    this.grid = [];
    this.totalSolidTiles = 0;
    this.destroyedTiles = 0;

    this.renderTexture = null;
    this.eraseBrush = null;
    this.sourceCanvas = null;
  }

  init(textureKey) {
    // Create Render Texture displaying the full webpage screenshot
    this.renderTexture = this.scene.add.renderTexture(0, 0, this.width, this.height);
    this.renderTexture.setOrigin(0, 0);
    this.renderTexture.draw(textureKey, 0, 0);

    // Reusable circular erase brush texture for smooth blast craters
    const g = this.scene.make.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(32, 32, 32);
    g.generateTexture('erase_brush_64', 64, 64);
    g.destroy();

    this.eraseBrush = this.scene.make.image({ key: 'erase_brush_64' }, false);

    // Sample image pixels via hidden canvas to detect empty vs solid areas
    const sourceImage = this.scene.textures.get(textureKey).getSourceImage();
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(sourceImage, 0, 0);
    this.sourceCanvas = ctx;

    const imgData = ctx.getImageData(0, 0, this.width, this.height).data;

    // Build the solid collision grid
    this.grid = new Array(this.cols);
    for (let c = 0; c < this.cols; c++) {
      this.grid[c] = new Uint8Array(this.rows);
      for (let r = 0; r < this.rows; r++) {
        const sampleX = Math.min(c * this.tileSize + Math.floor(this.tileSize / 2), this.width - 1);
        const sampleY = Math.min(r * this.tileSize + Math.floor(this.tileSize / 2), this.height - 1);
        const idx = (sampleY * this.width + sampleX) * 4;
        const alpha = imgData[idx + 3];

        // If pixel is visible, mark as solid tile
        if (alpha > 30) {
          this.grid[c][r] = 1;
          this.totalSolidTiles++;
        } else {
          this.grid[c][r] = 0;
        }
      }
    }

    // Always create a solid bedrock / ground floor at the very bottom so player never falls into void
    for (let c = 0; c < this.cols; c++) {
      for (let r = this.rows - 2; r < this.rows; r++) {
        if (this.grid[c][r] === 0) {
          this.grid[c][r] = 1;
          this.totalSolidTiles++;
        }
      }
    }
  }

  isSolid(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    return this.grid[col][row] === 1;
  }

  getSampleColor(worldX, worldY) {
    if (!this.sourceCanvas) return 0xffffff;
    const px = Math.max(0, Math.min(Math.floor(worldX), this.width - 1));
    const py = Math.max(0, Math.min(Math.floor(worldY), this.height - 1));
    const pixel = this.sourceCanvas.getImageData(px, py, 1, 1).data;
    return (pixel[0] << 16) | (pixel[1] << 8) | pixel[2];
  }

  // Radial damage carving: Erases graphics and clears grid cells
  damageAt(worldX, worldY, radius = 24) {
    if (!this.renderTexture) return;

    // Erase visual circle from render texture
    const scale = (radius * 2) / 64;
    this.eraseBrush.setScale(scale);
    this.renderTexture.erase(this.eraseBrush, worldX, worldY);

    // Clear corresponding cells in collision grid
    const startCol = Math.max(0, Math.floor((worldX - radius) / this.tileSize));
    const endCol = Math.min(this.cols - 1, Math.floor((worldX + radius) / this.tileSize));
    const startRow = Math.max(0, Math.floor((worldY - radius) / this.tileSize));
    const endRow = Math.min(this.rows - 1, Math.floor((worldY + radius) / this.tileSize));

    const radiusSq = radius * radius;
    let newlyDestroyed = 0;

    for (let c = startCol; c <= endCol; c++) {
      for (let r = startRow; r <= endRow; r++) {
        if (this.grid[c][r] === 1) {
          const tileCenterX = c * this.tileSize + this.tileSize / 2;
          const tileCenterY = r * this.tileSize + this.tileSize / 2;
          const distSq = (tileCenterX - worldX) ** 2 + (tileCenterY - worldY) ** 2;

          if (distSq <= radiusSq) {
            this.grid[c][r] = 0;
            this.destroyedTiles++;
            newlyDestroyed++;

            // Spawn particle debris for destroyed block
            if (this.scene.particleSystem && Math.random() > 0.4) {
              const color = this.getSampleColor(tileCenterX, tileCenterY);
              this.scene.particleSystem.spawnTileDebris(tileCenterX, tileCenterY, color, 2);
            }
          }
        }
      }
    }

    if (newlyDestroyed > 0 && this.scene.onDestructionProgress) {
      const pct = Math.min(100, Math.round((this.destroyedTiles / Math.max(1, this.totalSolidTiles)) * 100));
      this.scene.onDestructionProgress(pct, this.destroyedTiles, newlyDestroyed);
    }
  }

  // Fast AABB Collision solver for Entities against the 16x16 grid
  resolveEntityCollision(entity, delta) {
    const halfW = entity.width / 2;
    const halfH = entity.height / 2;

    // 1. Horizontal Movement & Collision
    entity.x += entity.vx * delta;
    let minCol = Math.max(0, Math.floor((entity.x - halfW) / this.tileSize));
    let maxCol = Math.min(this.cols - 1, Math.floor((entity.x + halfW) / this.tileSize));
    let minRow = Math.max(0, Math.floor((entity.y - halfH + 4) / this.tileSize));
    let maxRow = Math.min(this.rows - 1, Math.floor((entity.y + halfH - 4) / this.tileSize));

    for (let c = minCol; c <= maxCol; c++) {
      for (let r = minRow; r <= maxRow; r++) {
        if (this.isSolid(c, r)) {
          if (entity.vx > 0) {
            entity.x = c * this.tileSize - halfW;
            entity.vx = 0;
          } else if (entity.vx < 0) {
            entity.x = (c + 1) * this.tileSize + halfW;
            entity.vx = 0;
          }
        }
      }
    }

    // 2. Vertical Movement & Collision
    entity.y += entity.vy * delta;
    minCol = Math.max(0, Math.floor((entity.x - halfW + 2) / this.tileSize));
    maxCol = Math.min(this.cols - 1, Math.floor((entity.x + halfW - 2) / this.tileSize));
    minRow = Math.max(0, Math.floor((entity.y - halfH) / this.tileSize));
    maxRow = Math.min(this.rows - 1, Math.floor((entity.y + halfH) / this.tileSize));

    entity.onGround = false;

    for (let c = minCol; c <= maxCol; c++) {
      for (let r = minRow; r <= maxRow; r++) {
        if (this.isSolid(c, r)) {
          if (entity.vy > 0) {
            // Ground collision
            entity.y = r * this.tileSize - halfH;
            entity.vy = 0;
            entity.onGround = true;
          } else if (entity.vy < 0) {
            // Ceiling collision
            entity.y = (r + 1) * this.tileSize + halfH;
            entity.vy = 0;
          }
        }
      }
    }

    // Keep within world boundaries
    entity.x = Math.max(halfW, Math.min(this.width - halfW, entity.x));
    entity.y = Math.max(halfH, Math.min(this.height - halfH, entity.y));
  }
}
