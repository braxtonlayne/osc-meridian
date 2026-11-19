/** One Help Desk article: record copy with previous/next article controls. */
import type { RouteEntry } from '@core/contracts';
import { Button } from '@design/index';
import { useSys } from '../ctx';
import { DocPane } from '../DocPane';
import { HOME } from '../logic';

export function KbArticle({ entry, articles }: { entry: RouteEntry; articles: RouteEntry[] }) {
  const { navTo } = useSys();
  const i = articles.findIndex((a) => a.route === entry.route);
  const prev = i > 0 ? articles[i - 1] : undefined;
  const next = i >= 0 && i < articles.length - 1 ? articles[i + 1] : undefined;
  return (
    <div class="sys-fill">
      <div class="sys-kbbar" role="group" aria-label="Article navigation">
        <Button size="small" label="&All articles" onClick={() => navTo(HOME)} />
        <Button size="small" label="&Previous" disabled={!prev} onClick={() => prev && navTo(prev.route)} />
        <Button size="small" label="&Next" disabled={!next} onClick={() => next && navTo(next.route)} />
        <span class="sys-dim">{i >= 0 ? `Article ${i + 1} of ${articles.length}` : entry.docNo}</span>
      </div>
      <div class="sys-scroll">
        <DocPane entry={entry} />
      </div>
    </div>
  );
}
