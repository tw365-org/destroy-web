import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fallback chrome paths if puppeteer can't auto-resolve
const KNOWN_CHROME_PATHS = [
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
  '/root/.cache/puppeteer/chrome/linux-152.0.7977.75/chrome-linux64/chrome'
];

async function getExecutablePath() {
  for (const p of KNOWN_CHROME_PATHS) {
    try {
      await fs.access(p);
      return p;
    } catch {
      // continue
    }
  }
  return undefined; // Let puppeteer resolve
}

let browserInstance = null;

async function getBrowser() {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }
  const executablePath = await getExecutablePath();
  browserInstance = await puppeteer.launch({
    executablePath,
    headless: 'shell',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-sync',
      '--hide-scrollbars'
    ]
  });
  return browserInstance;
}

export async function scrapeWebsite(targetUrl) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({
      width: 1280,
      height: 1800,
      deviceScaleFactor: 1
    });

    let title = 'Destroy-Web';

    if (targetUrl === 'demo' || targetUrl === 'preset:demo') {
      const demoPath = path.join(__dirname, 'presets/demo.html');
      const htmlContent = await fs.readFile(demoPath, 'utf-8');
      await page.setContent(htmlContent, { waitUntil: 'load' });
      title = '台灣恐懼美食生化靶場';
    } else {
      await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 12000
      });
      // Give dynamic fonts / styling an extra second to settle
      await new Promise(r => setTimeout(r, 1200));
      title = await page.title() || targetUrl;
    }

    // Hide scrollbars & sticky fixed clutter if needed
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = `
        ::-webkit-scrollbar { display: none !important; }
        body { overflow: hidden !important; }
      `;
      document.head.appendChild(style);
    });

    // Measure page content height clamped between 1200 and 2400
    const measuredHeight = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      const height = Math.max(
        body ? body.scrollHeight : 0,
        body ? body.offsetHeight : 0,
        html ? html.clientHeight : 0,
        html ? html.scrollHeight : 0,
        html ? html.offsetHeight : 0
      );
      return Math.min(Math.max(height, 1200), 2400);
    });

    await page.setViewport({
      width: 1280,
      height: measuredHeight,
      deviceScaleFactor: 1
    });

    const screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage: false,
      clip: {
        x: 0,
        y: 0,
        width: 1280,
        height: measuredHeight
      }
    });

    return {
      buffer: screenshotBuffer,
      title: title.slice(0, 80),
      width: 1280,
      height: measuredHeight,
      url: targetUrl
    };
  } finally {
    await page.close().catch(() => {});
  }
}
