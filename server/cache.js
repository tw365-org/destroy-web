import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const CACHE_DIR = path.resolve(process.cwd(), '.cache/levels');

export async function initCache() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

export function hashUrl(url) {
  return crypto.createHash('sha256').update(url.toLowerCase().trim()).digest('hex').slice(0, 16);
}

export async function getCachedLevel(url) {
  const hash = hashUrl(url);
  const jsonPath = path.join(CACHE_DIR, `${hash}.json`);
  const pngPath = path.join(CACHE_DIR, `${hash}.png`);

  try {
    const [jsonRaw, pngStat] = await Promise.all([
      fs.readFile(jsonPath, 'utf-8'),
      fs.stat(pngPath)
    ]);
    const metadata = JSON.parse(jsonRaw);
    return {
      hit: true,
      hash,
      metadata,
      imageUrl: `/levels/${hash}.png`,
      cachedAt: pngStat.mtimeMs
    };
  } catch {
    return { hit: false, hash };
  }
}

export async function saveCachedLevel(url, metadata, imageBuffer) {
  await initCache();
  const hash = hashUrl(url);
  const jsonPath = path.join(CACHE_DIR, `${hash}.json`);
  const pngPath = path.join(CACHE_DIR, `${hash}.png`);

  await Promise.all([
    fs.writeFile(jsonPath, JSON.stringify(metadata, null, 2)),
    fs.writeFile(pngPath, imageBuffer)
  ]);

  return {
    hash,
    metadata,
    imageUrl: `/levels/${hash}.png`
  };
}
