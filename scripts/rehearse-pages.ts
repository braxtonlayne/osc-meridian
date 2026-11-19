/**
 * GitHub Pages rehearsal server.
 *
 * npm run rehearse  (= npm run build:pages && tsx scripts/rehearse-pages.ts)
 *   Copies the built dist into <tmp>/<base>/, serves the temp root like Pages does (directory
 *   index.html, 404.html fallback with status 404), runs `npx playwright test` with BASE_URL
 *   pointing at it, then stops the server and removes the temp dir. Extra arguments are passed
 *   to playwright (e.g. `-- --grep smoke`).
 *
 * tsx scripts/rehearse-pages.ts --serve --port <n>
 *   Serve only (used by playwright.config.ts as its webServer); runs until killed.
 *
 * The mount path is the base the dist was built with (read from dist/index.html): /osc-meridian/
 * after build:pages, / after a plain build. dist directory: $MERIDIAN_DIST or --dist <dir>.
 */
import { createServer, type Server } from 'node:http';
import { cpSync, createReadStream, existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

export function distPath(): string {
  return resolve(root, arg('dist') ?? process.env.MERIDIAN_DIST ?? 'dist');
}

/** Base path the dist was built with ("/" or "/osc-meridian/"), from its index.html asset URLs. */
export function distBase(dist: string): string {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const m = /(?:src|href)="(\/[^"]*?)assets\//.exec(html);
  const b = m?.[1] ?? '/';
  return b.endsWith('/') ? b : `${b}/`;
}

/** Serves siteRoot like GitHub Pages: /dir -> /dir/ redirect, index.html, 404.html fallback. */
export function pagesServer(siteRoot: string, base = '/'): Server {
  const notFound = join(siteRoot, ...base.split('/').filter(Boolean), '404.html');
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

/** Copy dist under <tmp>/<base>/ and start serving. */
export async function startRehearsal(dist: string, port = 0): Promise<{ url: string; stop: () => Promise<void> }> {
  if (!existsSync(join(dist, 'index.html'))) throw new Error(`${dist}/index.html missing: build first`);
  const base = distBase(dist);
  const tmp = mkdtempSync(join(tmpdir(), 'meridian-pages-'));
  cpSync(dist, join(tmp, ...base.split('/').filter(Boolean)), { recursive: true });
  const server = pagesServer(tmp, base);
  await new Promise<void>((ok, fail) => {
    server.once('error', fail);
    server.listen(port, '127.0.0.1', () => ok());
  });
  const addr = server.address();
  const actual = typeof addr === 'object' && addr ? addr.port : port;
  return {
    url: `http://127.0.0.1:${actual}${base}`,
    stop: async () => {
      server.closeAllConnections();
      await new Promise<void>((ok) => server.close(() => ok()));
      rmSync(tmp, { recursive: true, force: true });
    },
  };
}

async function main(): Promise<number> {
  const dist = distPath();
  if (process.argv.includes('--serve')) {
    const { url, stop } = await startRehearsal(dist, Number(arg('port') ?? 0));
    console.log(`[rehearse] serving ${dist} at ${url}`);
    const quit = () => void stop().then(() => process.exit(0));
    process.on('SIGINT', quit);
    process.on('SIGTERM', quit);
    return new Promise<number>(() => {}); // until killed
  }

  let rehearsal: Awaited<ReturnType<typeof startRehearsal>>;
  try {
    rehearsal = await startRehearsal(dist);
  } catch (e) {
    console.error(`[rehearse] ${(e as Error).message}`);
    return 1;
  }
  console.log(`[rehearse] serving ${dist} at ${rehearsal.url}`);
  const extra = process.argv.slice(2).filter((a, i, all) => a !== '--dist' && all[i - 1] !== '--dist');
  const code = await new Promise<number>((done) => {
    const child = spawn('npx', ['playwright', 'test', ...extra], {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, BASE_URL: rehearsal.url, MERIDIAN_DIST: dist },
    });
    child.on('exit', (c) => done(c ?? 1));
    child.on('error', () => done(1));
  });
  await rehearsal.stop();
  console.log(`[rehearse] playwright exited ${code}`);
  return code;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((c) => process.exit(c));
}
