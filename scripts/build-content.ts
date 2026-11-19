/**
 * npm run content
 *   tsx scripts/build-content.ts [--content <dir>] [--canon <file>] [--out <dir>] [--base </x/>]
 *                                [--manifest <file>] [--dry-run] [--only <dir>] [--lenient]
 * Defaults: content/, content/canon/canon.json, repo root, $MERIDIAN_BASE or "/",
 * content/manifest.json when it exists. Flags are documented in scripts/content/README.md.
 * Exits 1 with file:line problems on any error.
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { buildContent, loadManifestDocNos } from './content/build.ts';
import { ContentBuildError, type Problem } from './content/util.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0) return process.argv[i + 1];
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  return eq?.slice(name.length + 3);
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const contentDir = resolve(root, arg('content') ?? 'content');
const canonPath = resolve(root, arg('canon') ?? 'content/canon/canon.json');
const outDir = resolve(root, arg('out') ?? '.');
const base = arg('base') ?? process.env.MERIDIAN_BASE ?? '/';
const dryRun = flag('dry-run');
const lenient = flag('lenient');
const only = arg('only');
const manifestArg = arg('manifest');
const manifestPath = manifestArg ? resolve(root, manifestArg) : resolve(contentDir, 'manifest.json');

if (/^[A-Za-z]:[\\/]/.test(base)) {
  // Git Bash rewrites "/osc-meridian/" into a Windows path; refuse rather than bake it into links.
  console.error(`[content] base "${base}" looks like a filesystem path (set MSYS_NO_PATHCONV=1 or use $MERIDIAN_BASE)`);
  process.exit(1);
}
if (only && !dryRun) {
  console.error('[content] --only is a validation mode and requires --dry-run');
  process.exit(1);
}
if (manifestArg && !existsSync(manifestPath)) {
  console.error(`[content] manifest not found: ${manifestPath}`);
  process.exit(1);
}

const fmt = (p: Problem) => `  ${p.file}${p.line ? `:${p.line}` : ''}  ${p.message}`;

try {
  const t0 = Date.now();
  if (!existsSync(canonPath)) console.warn(`[content] canon not found at ${canonPath}; :c and ::canon-table will fail if used`);
  const manifestDocNos = existsSync(manifestPath) ? loadManifestDocNos(manifestPath) : undefined;
  const r = buildContent({
    contentDir,
    canonPath,
    outDir: dryRun ? undefined : outDir,
    base,
    displayRoot: root,
    manifestDocNos,
    pendingXrefsAreWarnings: dryRun,
    lenient,
    onlyDir: only ? resolve(root, only) : undefined,
  });
  if (r.warnings.length) console.warn(`[content] ${r.warnings.length} warning(s):\n${r.warnings.map(fmt).join('\n')}`);
  const keys = Object.entries(r.releases).map(([k, v]) => `${k}:${Object.keys(v).length}`);
  const fam = new Map<string, number>();
  for (const e of r.routes) fam.set(e.family, (fam.get(e.family) ?? 0) + 1);
  console.log(
    `[content]${dryRun ? ' DRY RUN (nothing written)' : ''}${lenient ? ' LENIENT' : ''}${only ? ` scope ${only}` : ''} ` +
      `${r.routes.length} routes (${[...fam].map(([f, n]) => `${f} ${n}`).join(', ') || 'none'}); ` +
      `releases ${keys.join(' ') || 'none'}; ${r.figures.length} drift rules; ` +
      `manifest ${manifestDocNos ? `${manifestDocNos.size} docNos` : 'none'}; base ${base}; ${Date.now() - t0} ms`,
  );
  if (r.suppressed) console.log(`[content] ${r.suppressed} problem(s) in files outside ${only} not shown`);
  if (dryRun) console.log('[content] OK');
} catch (e) {
  if (e instanceof ContentBuildError) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
}
