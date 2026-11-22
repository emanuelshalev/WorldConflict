import { type JSX, useEffect, useMemo, useState } from 'react';
import { IconChevronLeft, IconCopy, IconLock, IconSearch } from '@tabler/icons-react';
import { type CodexEntry, type CodexKind, searchCodex } from '../../lib/codexMatch';
import { TERMS } from '../../lib/glossary';
import { isMet, isNew, metCount } from '../../lib/learn';
import { useGameStore } from '../../store/gameStore';
import { EntryBody, EntryHead, Glyph } from './Explainer';
import { KIND_WORD, asOfLabel, placeName, useCodex, useExplain } from './explain';
import { WhoDisc } from './WhoIsWho';

/**
 * The codex drawer tab (design-learn.md §8, D-53): every entry met so far, searchable by any
 * alias, by category, NEW for this month's finds, locked tiles for what is still ahead (never
 * their names), the situation briefings, and "How the game works" (the glossary). No toast
 * announces new entries: the count here is the only counter.
 */

type Tab = 'all' | CodexKind | 'situations' | 'rules';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'person', label: 'People' },
  { id: 'place', label: 'Places' },
  { id: 'group', label: 'Groups' },
  { id: 'term', label: 'Terms' },
  { id: 'event', label: 'Events' },
  { id: 'situations', label: 'Situations' },
  { id: 'rules', label: 'How the game works' },
];

const A_KIND: Record<CodexKind, string> = { person: 'A person', place: 'A place', group: 'A group', term: 'A term', event: 'An event' };

function Tile({ e, fresh, onOpen }: { e: CodexEntry; fresh: boolean; onOpen: () => void }) {
  return (
    <button type="button" className="lx-tile" onClick={onOpen}>
      {e.kind === 'person' ? <WhoDisc entry={e} /> : <Glyph entry={e} />}
      <span className="lx-tile-text">
        <b>{e.name}</b>
        <small>
          {KIND_WORD[e.kind]}
          {e.countryId ? ` · ${placeName(e.countryId)}` : ''}
        </small>
      </span>
      {fresh && <span className="lx-new">New</span>}
    </button>
  );
}

function Detail({ e, onBack }: { e: CodexEntry; onBack: () => void }) {
  const first = useGameStore((s) => s.learn.entries[e.id]?.firstMet);
  const [copied, setCopied] = useState(false);
  const report = () => {
    const text = `Codex report\nentry: ${e.id}\nas of: ${e.asOf}\ntext: ${e.short}\nwhat is wrong: `;
    navigator.clipboard?.writeText(text).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };
  return (
    <article className="lx-detail">
      <button type="button" className="lx-back" onClick={onBack}>
        <IconChevronLeft size={14} aria-hidden /> All entries
      </button>
      <EntryHead entry={e} />
      <EntryBody entry={e} layer={2} />
      {first && (
        <p className="lx-meta">
          First met: {first.title}, {asOfLabel(first.date)}
        </p>
      )}
      <div className="lx-meta num">As of {asOfLabel(e.asOf)}</div>
      {e.sources.length > 0 && (
        <ul className="lx-src">
          {e.sources.map((u) => (
            <li key={u}>
              <a href={u} target="_blank" rel="noreferrer noopener">
                {u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 70)}
              </a>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="wc-btn ghost small" onClick={report}>
        <IconCopy size={14} aria-hidden /> {copied ? 'Copied: paste it into a bug report' : 'Something wrong? Copy a report'}
      </button>
    </article>
  );
}

export function Codex(): JSX.Element {
  const codex = useCodex();
  const status = useGameStore((s) => s.codexStatus);
  const payload = useGameStore((s) => s.codex);
  const learn = useGameStore((s) => s.learn);
  const date = useGameStore((s) => s.worldState?.date ?? '');
  const openBriefing = useExplain((s) => s.openBriefing);
  // Opened on an entry or on the rules (the drawer remounts this per openCodex call)
  const [focus] = useState(() => useExplain.getState().codexFocus);
  const [tab, setTab] = useState<Tab>(focus === 'rules' ? 'rules' : 'all');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(focus && focus !== 'rules' ? focus : null);
  useEffect(() => {
    if (focus) useExplain.setState({ codexFocus: null });
    // On phones the drawer tab strip scrolls: bring the Codex tab into view
    document.querySelector('.drawer-tabs button.on')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [focus]);
  const all = useMemo(() => codex?.entries ?? [], [codex]);
  const met = all.filter((e) => isMet(learn, e.id));
  const total = all.length;
  const n = metCount(learn, all.map((e) => e.id));

  if (!codex) {
    return <p className="hint">{status === 'error' ? 'The codex could not load for this game. Everything else works.' : 'The codex loads with your game.'}</p>;
  }
  const entry = sel ? codex.byId.get(sel) : null;
  if (entry) return <Detail e={entry} onBack={() => setSel(null)} />;

  const query = q.trim();
  const results = query ? searchCodex(codex, query, 30) : null;
  const inTab = (e: CodexEntry) => tab === 'all' || tab === e.kind;
  const shown = (results ?? met.filter(inTab)).slice().sort((a, b) => Number(isNew(learn, b.id, date)) - Number(isNew(learn, a.id, date)) || a.name.localeCompare(b.name));
  const locked = results ? [] : all.filter((e) => !isMet(learn, e.id) && inTab(e));
  const count = (k: Tab) => (k === 'situations' ? (payload?.situations.length ?? 0) : k === 'rules' ? Object.keys(TERMS).length : k === 'all' ? met.length : met.filter((e) => e.kind === k).length);

  return (
    <div className="lx-codex">
      <div className="lx-progress">
        <span className="num">
          {n} of {total} met
        </span>
        <div className="lx-bar" aria-hidden>
          <i style={{ width: `${total ? (n / total) * 100 : 0}%` }} />
        </div>
      </div>
      <label className="lx-search">
        <IconSearch size={16} aria-hidden />
        <input type="search" placeholder="Search people, places, terms" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the codex" />
      </label>
      {!query && (
        <div className="lx-tabs" role="tablist" aria-label="Codex categories">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              {t.label}
              {t.id !== 'all' && t.id !== 'rules' && <span className="num"> {count(t.id)}</span>}
            </button>
          ))}
        </div>
      )}
      {tab === 'rules' && !query ? (
        <dl className="lx-rules">
          {Object.values(TERMS).map((t) => (
            <div key={t.id}>
              <dt>{t.name}</dt>
              <dd>{'definition' in t && t.definition ? t.definition : 'Shown on the HUD and the desk.'}</dd>
            </div>
          ))}
        </dl>
      ) : tab === 'situations' && !query ? (
        <ul className="lx-list">
          {(payload?.situations ?? []).map((s) => (
            <li key={s.id}>
              <button type="button" className="lx-row" onClick={() => openBriefing({ situationId: s.id })}>
                <span className="lx-info-i big" aria-hidden>
                  i
                </span>
                <span>
                  <b>{s.title}</b>
                  <span className="lx-row-short">{s.oneLine}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <>
          {query && shown.length === 0 && <p className="hint">Nothing in the codex matches "{query}".</p>}
          {!query && shown.length === 0 && <p className="hint">Nothing met here yet. Names you read in crises and briefings collect here.</p>}
          <div className="lx-grid">
            {shown.map((e) => (
              <Tile key={e.id} e={e} fresh={isNew(learn, e.id, date)} onOpen={() => setSel(e.id)} />
            ))}
            {locked.slice(0, 4).map((e) => (
              <div key={e.id} className="lx-tile locked" aria-label={`${A_KIND[e.kind]}, not met yet`}>
                <span className="lx-disc place" aria-hidden>
                  <IconLock size={14} />
                </span>
                <span className="lx-tile-text">
                  <b>{A_KIND[e.kind]}</b>
                  <small>Met later in your game</small>
                </span>
              </div>
            ))}
          </div>
          {locked.length > 4 && <p className="lx-meta">{locked.length - 4} more still to meet.</p>}
        </>
      )}
      <p className="lx-meta">Every entry: one line, the full story, sources and an "as of" date. Real events up to the game's start; anything after is your game.</p>
    </div>
  );
}
