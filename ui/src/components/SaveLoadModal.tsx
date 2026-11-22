import { useEffect, useState } from 'react';
import { IconCopy, IconDeviceFloppy, IconGitBranch, IconHome, IconRefresh, IconTrash, IconX } from '@tabler/icons-react';
import { type SaveRecord, branchGame, fetchSaves, loadGame, replaySave, useGameStore } from '../store/gameStore';
import { flag } from '../lib/format';
import { branchLabel, branchMonths, saveMonth, seedCodeFor } from '../lib/runs';
import { useModalFocus } from '../lib/useModalFocus';
import { SeedForm } from './reveal/SeedForm';
import '../styles/reveal.css';

const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');

/**
 * One saved game: Resume, Replay same opening (same seed and seat, from month 0), Branch from an
 * earlier month (a new save rebuilt from the same seed up to that month), its seed code and Delete
 * (F-02-6: replay and branch reachable outside the reveal).
 */
function SaveRow({ s, current, onDelete }: { s: SaveRecord; current: boolean; onDelete: () => void }) {
  const isLoading = useGameStore((st) => st.isLoading);
  const months = branchMonths(s);
  const [branchAt, setBranchAt] = useState(() => Math.max(0, months.length - 2));
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const code = seedCodeFor(s);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="list-item save-row">
      <div className="save-row-head">
        <div style={{ fontSize: 26 }} aria-hidden>
          {flag(s.playerCountry)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h5 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</h5>
          <p className="num">
            month {saveMonth(s)}
            {s.maxTurns ? ` of ${s.maxTurns}` : ''}
            {s.gameOver ? ' · finished' : ''}
            {s.leaderName ? ` · ${s.leaderName}` : ''}
            {s.updatedAt ? ` · ${new Date(s.updatedAt).toLocaleString()}` : ''}
            {current ? ' · current' : ''}
          </p>
          {s.whatIf && <p className="save-row-tag">What if: alternate history</p>}
        </div>
        <button className="wc-btn primary" onClick={() => loadGame(s.id)} disabled={isLoading}>
          Resume
        </button>
        <button className="icon-btn" title="Delete" aria-label={`Delete ${s.name}`} onClick={onDelete}>
          <IconTrash size={16} />
        </button>
      </div>
      <details className="save-row-more" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary>Replay or branch</summary>
        <div className="save-row-actions">
          <button className="wc-btn" disabled={isLoading} onClick={() => void replaySave(s)}>
            <IconRefresh size={16} aria-hidden /> Replay same opening
          </button>
          {s.branchable ? (
            <span className="save-row-branch">
              <label htmlFor={`branch-${s.id}`}>Branch from the start of</label>
              <select id={`branch-${s.id}`} className="leader-input" value={branchAt} onChange={(e) => setBranchAt(Number(e.target.value))}>
                {months.map((m) => (
                  <option key={m} value={m}>
                    {branchLabel(m, s)}
                  </option>
                ))}
              </select>
              <button className="wc-btn" disabled={isLoading} onClick={() => void branchGame(s.id, branchAt)}>
                <IconGitBranch size={16} aria-hidden /> Branch from this month
              </button>
            </span>
          ) : (
            <small className="save-row-note">Branching needs a game started with this version.</small>
          )}
          <span className="save-row-seed">
            Seed <b className="num">{code}</b>
            <button className="rv-link small" onClick={copy} aria-label={`Copy seed ${code}`}>
              <IconCopy size={14} aria-hidden /> {copied ? 'Copied' : 'Copy'}
            </button>
          </span>
        </div>
        <small className="save-row-note">Replay starts this seat again from month 1 with the same opening. A branch keeps this game and starts a new save from the month you pick, with every choice you made before it.</small>
      </details>
    </div>
  );
}

function SavesList({ onClose }: { onClose: () => void }) {
  const [saves, setSaves] = useState<SaveRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentSave = useGameStore((s) => s.saveId);
  const screen = useGameStore((s) => s.screen);

  useEffect(() => {
    let alive = true;
    fetchSaves()
      .then((list) => alive && setSaves(list))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Could not load saves'));
    return () => {
      alive = false;
    };
  }, []);

  const remove = async (id: string) => {
    await fetch(`${API_BASE}/save/${id}`, { method: 'DELETE' });
    setSaves((s) => (s ?? []).filter((x) => x.id !== id));
  };

  return (
    <div className="end" style={{ width: 'min(680px, 100%)' }} onClick={(e) => e.stopPropagation()}>
      <div className="drawer-head">
        <h3 style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <IconDeviceFloppy size={20} /> Saved games
        </h3>
        <button className="icon-btn" onClick={onClose} aria-label="Close">
          <IconX size={18} />
        </button>
      </div>
      <div className="end-body">
        <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 12.5 }}>
          Every month autosaves. Games are kept on this device (sign in to keep them across devices).
        </p>
        {error && <p style={{ color: 'var(--war)' }}>{error}</p>}
        {saves === null && !error && <p style={{ color: 'var(--text-3)' }}>Loading…</p>}
        {saves?.length === 0 && <p style={{ color: 'var(--text-2)' }}>No saved games yet.</p>}
        <div className="save-list">
          {saves?.map((s) => (
            <SaveRow key={s.id} s={s} current={s.id === currentSave} onDelete={() => void remove(s.id)} />
          ))}
        </div>
        <div className="save-seed">
          <SeedForm id="saves-seed" />
        </div>
        {screen === 'game' && (
          <div className="end-actions" style={{ justifyContent: 'space-between' }}>
            <button
              className="wc-btn ghost"
              onClick={() => {
                onClose();
                useGameStore.getState().reset();
              }}
            >
              <IconHome size={16} /> Main menu
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function SaveLoadModal() {
  const activeModal = useGameStore((s) => s.activeModal);
  const closeModal = useGameStore((s) => s.closeModal);
  const ref = useModalFocus<HTMLDivElement>(activeModal === 'saveLoad');
  if (activeModal !== 'saveLoad') return null;
  return (
    <div ref={ref} className="overlay" onClick={closeModal} style={{ zIndex: 110 }} role="dialog" aria-modal="true" aria-label="Saved games">
      <SavesList onClose={closeModal} />
    </div>
  );
}
