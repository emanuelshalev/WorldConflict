import { useState } from 'react';
import { IconCpu, IconX } from '@tabler/icons-react';
import {
  type AITier,
  DEFAULT_LLM_SETTINGS,
  LLM_MODEL_DEFAULTS,
  type LLMSettings,
  llmRequestBody,
  useGameStore,
} from '../store/gameStore';
import { useModalFocus } from '../lib/useModalFocus';

const CHAT_TEST_URL = `${(import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '')}/chat/test`;

const TIERS: Array<{ id: AITier; name: string; blurb: string; callsPerTurn: number }> = [
  {
    id: 'ALGORITHMIC',
    name: 'Algorithmic',
    blurb: 'Every leader is driven by the built-in personality engine, history, red lines, beliefs. Free, offline, instant, reproducible.',
    callsPerTurn: 0,
  },
  {
    id: 'KEY_DECISIONS',
    name: 'LLM for key decisions',
    blurb: 'The engine runs the world; an LLM takes over a leader only at high-stakes moments, war, nukes, coups, ceasefires, and for your advisors.',
    callsPerTurn: 1.2,
  },
  {
    id: 'FULL_LLM',
    name: 'Full LLM',
    blurb: 'The most relevant leaders each month (rivals, great powers, belligerents) think with an LLM and issue public statements. Richest, slowest, priciest.',
    callsPerTurn: 6,
  },
];

const PROVIDERS: Array<{ id: LLMSettings['provider']; name: string; key?: string; url?: string; note: string }> = [
  { id: 'anthropic', name: 'Claude (Anthropic)', key: 'sk-ant-…', note: 'API key from console.anthropic.com.' },
  { id: 'openai', name: 'OpenAI', key: 'sk-…', note: 'API key from platform.openai.com.' },
  { id: 'gemini', name: 'Google Gemini', key: 'AIza…', note: 'API key from aistudio.google.com.' },
  { id: 'ollama', name: 'Ollama (local)', url: 'http://localhost:11434', note: 'Free and private. Ollama must be running on the game server machine.' },
  { id: 'local', name: 'LM Studio / vLLM (local)', url: 'http://localhost:1234/v1', note: 'Any OpenAI-compatible local server. Free and private.' },
];

// Mirrors src/agents/usage.ts (USD per 1M tokens; estimates)
const PRICES: Record<string, [number, number]> = {
  'claude-haiku-5-5': [0.1, 0.5],
  'claude-haiku-4-5': [1, 5],
  'claude-sonnet-5': [2, 10],
  'claude-opus-5-5': [4, 20],
  'gpt-4o-mini': [0.15, 0.6],
  'gpt-4.1-nano': [0.1, 0.4],
  'gpt-4.1-mini': [0.4, 1.6],
  'gpt-4o': [2.5, 10],
  'gemini-2.5-flash-lite': [0.1, 0.4],
  'gemini-2.5-flash': [0.3, 2.5],
  'gemini-2.5-pro': [1.25, 10],
};

function priceFor(provider: string, model: string): [number, number] | null {
  if (provider === 'ollama' || provider === 'local') return [0, 0];
  const key = Object.keys(PRICES)
    .filter((k) => model.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return key ? PRICES[key] : null;
}

function Inner({ onClose }: { onClose: () => void }) {
  const llmSettings = useGameStore((s) => s.llmSettings);
  const setLLMSettings = useGameStore((s) => s.setLLMSettings);
  const usage = useGameStore((s) => s.aiTotalUsage);
  const world = useGameStore((s) => s.worldState);
  const [draft, setDraft] = useState<LLMSettings>({ ...DEFAULT_LLM_SETTINGS, ...llmSettings });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  const provider = draft.provider === 'builtin' ? 'anthropic' : draft.provider;
  const def = PROVIDERS.find((p) => p.id === provider);
  const model = draft.model || LLM_MODEL_DEFAULTS[provider];
  const price = priceFor(provider, model);
  const tier = TIERS.find((t) => t.id === draft.tier) ?? TIERS[0];
  const turns = world?.maxTurns ?? 12;
  // ~1,600 prompt + 250 completion tokens per leader decision
  const perCall = price ? (1600 * price[0] + 250 * price[1]) / 1e6 : null;
  const estimate = perCall !== null ? perCall * tier.callsPerTurn * turns : null;

  const set = (patch: Partial<LLMSettings>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setTestResult(null);
  };

  const test = async () => {
    const body = llmRequestBody({ ...draft, provider });
    if (!body) return;
    setTesting(true);
    try {
      const res = await fetch(CHAT_TEST_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      setTestResult(data.success ? { ok: true, text: `Connected, ${data.model} says "${data.sample}"` } : { ok: false, text: data.error ?? 'Connection failed' });
    } catch (err) {
      setTestResult({ ok: false, text: err instanceof Error ? err.message : 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  const save = () => {
    const next = draft.tier === 'ALGORITHMIC' ? { ...draft } : { ...draft, provider };
    setLLMSettings(next);
    onClose();
  };

  return (
    <div className="end" style={{ width: 'min(720px, 100%)' }} onClick={(e) => e.stopPropagation()}>
      <div className="drawer-head">
        <h3 style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <IconCpu size={20} /> World intelligence
        </h3>
        <button className="icon-btn" onClick={onClose} aria-label="Close">
          <IconX size={18} />
        </button>
      </div>
      <div className="end-body">
        <div>
          <div className="section-label" style={{ marginTop: 0 }}>Who runs the world?</div>
          <div className="mode-grid">
            {TIERS.map((t) => (
              <button key={t.id} className={`mode-card ${draft.tier === t.id ? 'active' : ''}`} onClick={() => set({ tier: t.id })}>
                <div className="mode-time">{t.callsPerTurn === 0 ? 'FREE · OFFLINE' : `~${t.callsPerTurn} LLM CALLS / MONTH`}</div>
                <h3 style={{ fontSize: 20 }}>{t.name}</h3>
                <p>{t.blurb}</p>
              </button>
            ))}
          </div>
        </div>

        {draft.tier !== 'ALGORITHMIC' && (
          <div>
            <div className="section-label" style={{ marginTop: 0 }}>Model</div>
            <div className="seg" style={{ flexWrap: 'wrap', borderRadius: 12 }}>
              {PROVIDERS.map((p) => (
                <button key={p.id} className={provider === p.id ? 'on' : ''} onClick={() => set({ provider: p.id, model: '', baseUrl: '' })}>
                  {p.name}
                </button>
              ))}
            </div>
            <p style={{ color: 'var(--text-3)', fontSize: 12.5 }}>
              {def?.note} Your key is stored only in this browser and sent to the game server with each request.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
              {def?.key && (
                <input className="leader-input" style={{ width: '100%' }} type="password" placeholder={def.key} value={draft.apiKey} onChange={(e) => set({ apiKey: e.target.value })} />
              )}
              {def?.url && (
                <input className="leader-input" style={{ width: '100%' }} placeholder={def.url} value={draft.baseUrl} onChange={(e) => set({ baseUrl: e.target.value })} />
              )}
              <input className="leader-input" style={{ width: '100%' }} placeholder={LLM_MODEL_DEFAULTS[provider]} value={draft.model} onChange={(e) => set({ model: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
              <button className="wc-btn" onClick={test} disabled={testing || (!!def?.key && !draft.apiKey)}>
                {testing ? 'Testing…' : 'Test connection'}
              </button>
              {testResult && <span style={{ fontSize: 12.5, color: testResult.ok ? 'var(--good)' : 'var(--war)' }}>{testResult.text}</span>}
            </div>

            <div className="list-item" style={{ marginTop: 14 }}>
              <h5>Cost, up front</h5>
              <p>
                {price === null
                  ? `Unknown price for "${model}", usage will be shown in tokens.`
                  : price[0] === 0
                    ? 'Local model: $0. Speed depends on your hardware.'
                    : `${model}: ~$${(perCall ?? 0).toFixed(4)} per leader decision → about ${(estimate ?? 0) < 0.01 ? 'under a cent' : `$${(estimate ?? 0).toFixed(2)}`} for a ${turns}-month game at this tier (advisor chats extra).`}
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>Stop using the LLM after</span>
                <input
                  className="leader-input"
                  style={{ width: 90 }}
                  type="number"
                  min={0}
                  step={0.25}
                  value={draft.budgetUsd}
                  onChange={(e) => set({ budgetUsd: Number(e.target.value) })}
                />
                <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>USD per game (0 = no cap). The algorithmic AI takes over silently.</span>
              </div>
            </div>
          </div>
        )}

        {usage && (
          <div className="list-item">
            <h5>This game so far</h5>
            <p className="num">
              {usage.calls} LLM calls · {(usage.promptTokens + usage.completionTokens).toLocaleString()} tokens ·{' '}
              {usage.costUsd === null ? 'cost unknown' : `$${usage.costUsd.toFixed(4)}`} · {usage.fallbacks} fallbacks to the engine
            </p>
          </div>
        )}

        <div className="end-actions" style={{ justifyContent: 'flex-end' }}>
          <button className="wc-btn ghost" onClick={() => setDraft(DEFAULT_LLM_SETTINGS)}>
            Reset to free
          </button>
          <button className="wc-btn primary" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettingsModal() {
  const activeModal = useGameStore((s) => s.activeModal);
  const closeModal = useGameStore((s) => s.closeModal);
  const ref = useModalFocus<HTMLDivElement>(activeModal === 'settings');
  if (activeModal !== 'settings') return null;
  return (
    <div ref={ref} className="overlay" onClick={closeModal} style={{ zIndex: 110 }} role="dialog" aria-modal="true" aria-label="Settings">
      <Inner onClose={closeModal} />
    </div>
  );
}
