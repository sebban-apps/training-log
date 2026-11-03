// Walidacja manifestu PWA i tożsamości aplikacji. Uruchom: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
// adres, pod którym aplikacja działa na GitHub Pages (sebban-apps/training-log)
const DEPLOYED_MANIFEST_URL = 'https://sebban-apps.github.io/training-log/manifest.json';
// tożsamość już zainstalowanych kopii (domyślna, wyliczana wcześniej przez Chrome ze start_url).
// NIE ZMIENIAĆ: inna wartość = przeglądarka uzna aplikację za nową i zduplikuje instalację.
const EXPECTED_ID = 'https://sebban-apps.github.io/training-log/index.html';

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

function pngSize(file) {
  const buf = fs.readFileSync(file);
  assert.equal(buf.toString('ascii', 1, 4), 'PNG', `${file} nie jest plikiem PNG`);
  return `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`;
}

test('manifest ma wszystkie ważne pola', () => {
  for (const key of ['id', 'name', 'short_name', 'start_url', 'scope', 'display', 'theme_color', 'background_color', 'icons']) {
    assert.ok(manifest[key], `brak pola "${key}"`);
  }
  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/i);
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i);
  assert.ok(['standalone', 'fullscreen', 'minimal-ui'].includes(manifest.display));
});

test('id rozwiązuje się do stałej tożsamości tego projektu', () => {
  // Chrome rozwiązuje id względem ORIGIN, nie folderu, więc "./index.html" dałoby /index.html
  // na całej domenie. Dlatego id to pełna ścieżka od korzenia domeny.
  assert.ok(manifest.id.startsWith('/training-log/'), 'id musi zaczynać się od /training-log/');
  const origin = new URL(DEPLOYED_MANIFEST_URL).origin;
  assert.equal(new URL(manifest.id, origin).href, EXPECTED_ID);
});

test('start_url leży w scope, a scope obejmuje tylko folder aplikacji', () => {
  const startUrl = new URL(manifest.start_url, DEPLOYED_MANIFEST_URL).href;
  const scope = new URL(manifest.scope, DEPLOYED_MANIFEST_URL).href;
  assert.equal(scope, 'https://sebban-apps.github.io/training-log/');
  assert.ok(startUrl.startsWith(scope), `${startUrl} poza ${scope}`);
  // inne aplikacje na tej samej domenie nie mogą wpadać w zakres
  for (const other of ['https://sebban-apps.github.io/Journal-PWA/', 'https://sebban-apps.github.io/Calendar-PWA/']) {
    assert.ok(!other.startsWith(scope), `zakres obejmuje ${other}`);
  }
});

test('ikony istnieją i mają zadeklarowane rozmiary', () => {
  const purposes = new Set();
  for (const icon of manifest.icons) {
    const file = path.join(ROOT, icon.src);
    assert.ok(fs.existsSync(file), `brak pliku ${icon.src}`);
    assert.equal(icon.type, 'image/png');
    assert.equal(pngSize(file), icon.sizes, `zły rozmiar ${icon.src}`);
    (icon.purpose || 'any').split(' ').forEach((p) => purposes.add(p));
  }
  assert.ok(manifest.icons.some((i) => i.sizes === '192x192'), 'brak ikony 192x192');
  assert.ok(manifest.icons.some((i) => i.sizes === '512x512'), 'brak ikony 512x512');
  assert.ok(purposes.has('maskable'), 'brak ikony maskable');
});

test('index.html wskazuje manifest, a service worker cache zawiera manifest i ikony', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /<link rel="manifest" href="manifest\.json"/);
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  for (const asset of ['./manifest.json', ...manifest.icons.map((i) => `./${i.src}`)]) {
    assert.ok(sw.includes(`'${asset}'`), `sw.js nie cache'uje ${asset}`);
  }
  // każdy plik z listy ASSETS musi istnieć, inaczej instalacja service workera się wywróci
  const assets = [...sw.matchAll(/'\.\/([^']+)'/g)].map((m) => m[1]);
  for (const a of assets) assert.ok(fs.existsSync(path.join(ROOT, a)), `sw.js wymienia nieistniejący plik ${a}`);
});
