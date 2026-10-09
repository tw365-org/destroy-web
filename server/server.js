import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { validateUrl } from './security.js';
import { getCachedLevel, saveCachedLevel, initCache } from './cache.js';
import { scrapeWebsite } from './scraper.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve cached level screenshots as static assets
const cacheDir = path.resolve(process.cwd(), '.cache/levels');
app.use('/levels', express.static(cacheDir));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/presets', (req, res) => {
  res.json([
    {
      id: 'demo',
      name: '夜市生化靶場',
      url: 'demo',
      description: '台灣 6 大恐懼美食生化開轟試煉場'
    },
    {
      id: 'wikipedia',
      name: '維基百科：火柴人',
      url: 'https://zh.wikipedia.org/wiki/火柴人',
      description: '經典繁體中文維基條目'
    },
    {
      id: 'hackernews',
      name: 'Hacker News 科技新聞',
      url: 'https://news.ycombinator.com',
      description: '經典極簡科技資訊聚合站'
    }
  ]);
});

app.post('/api/rasterize', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  const cleanUrl = url.trim();

  // Special case for offline/built-in demo
  if (cleanUrl === 'demo' || cleanUrl === 'preset:demo') {
    try {
      const cached = await getCachedLevel('demo');
      if (cached.hit) {
        return res.json({
          success: true,
          cached: true,
          url: 'demo',
          title: cached.metadata.title || '台灣恐懼美食生化靶場',
          width: cached.metadata.width,
          height: cached.metadata.height,
          imageUrl: cached.imageUrl
        });
      }

      const result = await scrapeWebsite('demo');
      const saved = await saveCachedLevel('demo', {
        title: result.title || '台灣恐懼美食生化靶場',
        width: result.width,
        height: result.height,
        url: 'demo'
      }, result.buffer);

      return res.json({
        success: true,
        cached: false,
        url: 'demo',
        title: result.title || '台灣恐懼美食生化靶場',
        width: result.width,
        height: result.height,
        imageUrl: saved.imageUrl
      });
    } catch (err) {
      console.error('Failed to render demo preset:', err);
      return res.status(500).json({ success: false, error: 'Failed to render demo page' });
    }
  }

  // Security & SSRF Validation
  const validation = await validateUrl(cleanUrl);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.reason });
  }

  const targetUrl = validation.url;

  try {
    // Check Cache First
    const cached = await getCachedLevel(targetUrl);
    if (cached.hit) {
      return res.json({
        success: true,
        cached: true,
        url: targetUrl,
        title: cached.metadata.title,
        width: cached.metadata.width,
        height: cached.metadata.height,
        imageUrl: cached.imageUrl
      });
    }

    // Scrape live site
    console.log(`Rasterizing live site: ${targetUrl}...`);
    const scraped = await scrapeWebsite(targetUrl);

    // Save to disk cache
    const saved = await saveCachedLevel(targetUrl, {
      title: scraped.title,
      width: scraped.width,
      height: scraped.height,
      url: targetUrl
    }, scraped.buffer);

    return res.json({
      success: true,
      cached: false,
      url: targetUrl,
      title: scraped.title,
      width: scraped.width,
      height: scraped.height,
      imageUrl: saved.imageUrl
    });
  } catch (err) {
    console.error(`Failed to rasterize URL (${targetUrl}):`, err);
    return res.status(500).json({
      success: false,
      error: `Could not capture webpage: ${err.message || 'Timed out or refused connection'}`
    });
  }
});

async function start() {
  await initCache();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Destroy-Web Server listening on http://0.0.0.0:${PORT}`);
  });
}

start().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
