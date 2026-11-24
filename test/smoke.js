// 실행: FABRIC=/path/to/fabric.min.js node test/smoke.js  (FABRIC 없으면 CDN 사용)
const { chromium } = require('playwright');
const path = require('path'), assert = require('assert');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1100, height: 900 } });
  if (process.env.FABRIC) await p.route('**/fabric.min.js', r => r.fulfill({ path: process.env.FABRIC, contentType: 'text/javascript' }));
  p.on('pageerror', e => { throw e; });
  await p.goto(process.env.URL || 'file://' + path.resolve(__dirname, '../index.html'));
  await p.fill('#title', '테스트 <가이드>');
  await p.fill('#purpose', '목적 설명');
  await p.click('[data-go="2"]');
  // 1x1이 아닌 실제 크기 PNG를 만들어 파일 선택으로 2장 업로드
  const png = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 1600; c.height = 900; const x = c.getContext('2d'); x.fillStyle = '#9cf'; x.fillRect(0, 0, 1600, 900); return c.toDataURL().split(',')[1]; });
  const buf = Buffer.from(png, 'base64');
  await p.setInputFiles('#file', [{ name: 'a.png', mimeType: 'image/png', buffer: buf }, { name: 'b.png', mimeType: 'image/png', buffer: buf }]);
  await p.waitForSelector('.card .editor:not([hidden])');
  assert.strictEqual(await p.locator('.card').count(), 2);
  const card = p.locator('.card').first();
  for (const t of ['rect', 'ellipse', 'arrow', 'marker', 'marker', 'blur']) await card.locator(`[data-t="${t}"]`).click();
  await card.locator('[data-t="text"]').click();
  await p.keyboard.type('여기를 클릭');
  await card.locator('.st-desc').fill('설명 1');
  await p.click('[data-go="3"]');
  const doc = p.locator('#p3 .doc');
  assert.match(await doc.innerText(), /테스트 <가이드>/);
  assert.strictEqual(await doc.locator('img').count(), 2);
  const w = await doc.locator('img').first().evaluate(i => i.naturalWidth);
  assert.strictEqual(w, 1600, '원본 해상도로 내보내야 함');
  if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT, fullPage: true });
  await p.click('[data-go="4"]');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#html')]);
  // 헤드리스 Chromium은 한글 파일명을 'download'로 바꿔서 파일명 대신 내용을 확인
  const saved = require('fs').readFileSync(await dl.path(), 'utf8');
  assert.match(saved, /테스트 &lt;가이드&gt;/);
  assert.strictEqual((saved.match(/<img /g) || []).length, 2);
  console.log('ok');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
