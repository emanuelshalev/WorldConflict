import { useEffect, useState } from 'react';
import { IconDeviceFloppy, IconHome, IconTrash, IconX } from '@tabler/icons-react';
import { fetchSaves, loadGame, useGameStore } from '../store/gameStore';
import { flag } from '../lib/format';

const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');

interface SaveRecord {
  id: string;
  name: string;
  turn: number;
  playerCountry: string;
  leaderName?: string;
  updatedAt?: string;
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
    <div className="end" style={{ width: 'min(640px, 100%)' }} onClick={(e) => e.stopPropagation()}>
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
        <div>
          {saves?.map((s) => (
            <div key={s.id} className="list-item" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 26 }}>{flag(s.playerCountry)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h5 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</h5>
                <p className="num">
                  month {s.turn}
                  {s.leaderName ? ` · ${s.leaderName}` : ''}
                  {s.updatedAt ? ` · ${new Date(s.updatedAt).toLocaleString()}` : ''}
                  {s.id === currentSave ? ' · current' : ''}
                </p>
              </div>
              <button className="wc-btn primary" onClick={() => loadGame(s.id)}>
                Resume
              </button>
              <button className="icon-btn" title="Delete" onClick={() => remove(s.id)}>
                <IconTrash size={16} />
              </button>
            </div>
          ))}
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
  if (activeModal !== 'saveLoad') return null;
  return (
    <div className="overlay" onClick={closeModal} style={{ zIndex: 110 }}>
      <SavesList onClose={closeModal} />
    </div>
  );
}
