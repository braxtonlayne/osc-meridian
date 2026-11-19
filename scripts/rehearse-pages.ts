/**
 * npm run rehearse  (= npm run build:pages && tsx scripts/rehearse-pages.ts)
 *
 * Rehearses the GitHub Pages deployment: copies dist/ into <tmp>/osc-meridian/, serves the
 * temp root with a tiny static server that mimics Pages (directory index.html, 404.html
 * fallback with status 404), runs `npx playwright test` with BASE_URL pointing at
 * http://127.0.0.1:<port>/osc-meridian/, then stops the server and removes the temp dir.
 * Extra arguments are passed to playwright (e.g. `-- --grep smoke`).
 */
import { createServer, type Server } from 'node:http';
import { cpSync, createReadStream, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SUBPATH = 'osc-meridian';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
};

export function pagesServer(siteRoot: string): Server {
  const notFound = join(siteRoot, SUBPATH, '404.html');
  return createServer((req, res) => {
    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    const target = normalize(join(siteRoot, pathname));
    if (!target.startsWith(siteRoot)) {
      res.writeHead(403).end();
      return;
    }
    let file: string | null = null;
    if (existsSync(target) && statSync(target).isFile()) file = target;
    else if (existsSync(join(target, 'index.html'))) {
      if (!pathname.endsWith('/')) {
        // Pages redirects /dir to /dir/
        res.writeHead(301, { Location: `${pathname}/` }).end();
        return;
      }
      file = join(target, 'index.html');
    }
    if (!file) {
      res.writeHead(404, { 'Content-Type': TYPES['.html']! });
      if (existsSync(notFound)) createReadStream(notFound).pipe(res);
      else res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
}

async function main(): Promise<number> {
  const dist = join(root, 'dist');
  if (!existsSync(join(dist, 'index.html'))) {
    console.error('[rehearse] dist/index.html missing: run npm run build:pages first');
    return 1;
  }
  const tmp = mkdtempSync(join(tmpdir(), 'meridian-pages-'));
  const site = join(tmp, SUBPATH);
  cpSync(dist, site, { recursive: true });
  const server = pagesServer(tmp);
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  const baseUrl = `http://127.0.0.1:${port}/${SUBPATH}/`;
  console.log(`[rehearse] serving ${site} at ${baseUrl}`);

  const extra = process.argv.slice(2);
  const code = await new Promise<number>((done) => {
    const child = spawn('npx', ['playwright', 'test', ...extra], {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, BASE_URL: baseUrl, MERIDIAN_BASE: `/${SUBPATH}/` },
    });
    child.on('exit', (c) => done(c ?? 1));
    child.on('error', () => done(1));
  });

  server.closeAllConnections();
  await new Promise<void>((ok) => server.close(() => ok()));
  rmSync(tmp, { recursive: true, force: true });
  console.log(`[rehearse] playwright exited ${code}`);
  return code;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((c) => process.exit(c));
}
