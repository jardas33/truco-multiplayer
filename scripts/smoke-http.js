const assert = require('assert');
const { spawn } = require('child_process');
const path = require('path');

let baseUrl = process.env.SMOKE_URL || null;
let managedServer = null;
let managedServerOutput = '';

const START_TIMEOUT_MS = 10_000;
const ROUTES = [
  '/',
  '/truco',
  '/poker',
  '/blackjack',
  '/go-fish',
  '/war',
  '/battleship-menu',
  '/battleship',
  '/wordle',
  '/prince-of-persia'
];

function isExternalUrl(value) {
  return /^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('mailto:');
}

function toAbsolutePath(assetPath, routePath) {
  const cleaned = assetPath.trim().replace(/^['"]|['"]$/g, '');
  if (!cleaned || isExternalUrl(cleaned) || cleaned.startsWith('#')) {
    return null;
  }

  const absolute = new URL(cleaned, `${baseUrl}${routePath}`).pathname;
  const query = new URL(cleaned, `${baseUrl}${routePath}`).search;
  return `${absolute}${query}`;
}

function collectAssets(html, routePath) {
  const assets = new Set();
  const patterns = [
    /<script\b[^>]*\bsrc=["']([^"']+)["']/gi,
    /<link\b[^>]*\bhref=["']([^"']+)["']/gi,
    /<img\b[^>]*\bsrc=["']([^"']+)["']/gi,
    /url\(([^)]+)\)/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html))) {
      const asset = toAbsolutePath(match[1], routePath);
      if (asset) {
        assets.add(asset);
      }
    }
  }

  return assets;
}

async function fetchOk(routePath) {
  const response = await fetch(`${baseUrl}${routePath}`);
  assert(response.ok, `${routePath} returned ${response.status}`);
  return response;
}

async function smokeRoute(routePath, allAssets) {
  const response = await fetchOk(routePath);
  const contentType = response.headers.get('content-type') || '';
  assert(contentType.includes('text/html'), `${routePath} should serve HTML, got ${contentType}`);

  const html = await response.text();
  assert(/<title>[^<]+<\/title>/i.test(html), `${routePath} is missing a title`);
  assert(/<\/html>/i.test(html), `${routePath} did not return a complete HTML document`);

  for (const asset of collectAssets(html, routePath)) {
    allAssets.add(asset);
  }
}

async function smokeAssets(assets) {
  for (const asset of Array.from(assets).sort()) {
    const response = await fetchOk(asset);
    const text = await response.text();
    assert(text.length > 0, `${asset} returned an empty response`);
  }
}

async function startManagedServer() {
  if (baseUrl) return;

  const port = process.env.SMOKE_PORT || String(4500 + Math.floor(Math.random() * 1000));
  baseUrl = `http://127.0.0.1:${port}`;
  const root = path.resolve(__dirname, '..');

  managedServer = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: port,
      NODE_ENV: 'test'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  managedServer.stdout.on('data', (chunk) => {
    managedServerOutput += chunk.toString();
  });
  managedServer.stderr.on('data', (chunk) => {
    managedServerOutput += chunk.toString();
  });

  const started = Date.now();
  while (Date.now() - started < START_TIMEOUT_MS) {
    if (managedServer.exitCode !== null) {
      throw new Error(`Managed smoke server exited early:\n${managedServerOutput}`);
    }

    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // Server is still booting.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Timed out waiting for managed smoke server:\n${managedServerOutput}`);
}

function stopManagedServer() {
  if (managedServer && managedServer.exitCode === null) {
    managedServer.kill();
  }
}

async function main() {
  await startManagedServer();

  const health = await fetchOk('/health');
  const healthBody = await health.json();
  assert.strictEqual(healthBody.status, 'healthy', '/health should report healthy');

  const assets = new Set(['/socket.io/socket.io.js']);
  for (const routePath of ROUTES) {
    await smokeRoute(routePath, assets);
    console.log(`OK route ${routePath}`);
  }

  await smokeAssets(assets);
  console.log(`OK ${assets.size} assets`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(() => {
  stopManagedServer();
});
