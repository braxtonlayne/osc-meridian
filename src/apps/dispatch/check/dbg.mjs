import { chromium } from 'playwright';
const BASE = 'http' + '://localhost:5307';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1500, height: 960 } })).newPage();
p.on('console', (m) => m.text().includes('DBGPLAT') && console.log(m.text().slice(0, 600)));
await p.goto(BASE + '/dispatch');
await p.waitForSelector('.lock-cardopt'); await p.click('.lock-cardopt[data-account="lifesupport"]');
await p.fill('#lock-op', 'x'); await p.fill('#lock-pass', 'y'); await p.press('#lock-pass', 'Enter');
await p.waitForSelector('.dsp-root'); await p.waitForTimeout(4000);
await b.close();
