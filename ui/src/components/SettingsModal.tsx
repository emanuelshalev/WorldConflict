import { useState } from 'react';
import {
  DEFAULT_LLM_SETTINGS,
  LLM_MODEL_DEFAULTS,
  llmRequestBody,
  useGameStore,
} from '../store/gameStore';
import type { LLMSettings } from '../store/gameStore';

const CHAT_TEST_URL = `${(import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '')}/chat/test`;

const PROVIDERS: Array<{ id: LLMSettings['provider']; name: string; blurb: string }> = [
  {
    id: 'builtin',
    name: 'Built-in brain (no AI service)',
    blurb:
      'The default. A deterministic engine that composes advisor answers and country decisions from the simulation itself — history, beliefs, the timeline of events. No API key, no cost, works offline.',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    blurb: 'Advisor conversations powered by an OpenAI model. Requires your API key (sk-…). The key is stored only in your browser and sent with each chat request.',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    blurb: 'Advisor conversations powered by Gemini. Requires your API key (AIza…). Stored only in your browser.',
  },
  {
    id: 'ollama',
    name: 'Ollama (local)',
    blurb: 'Run a local model via Ollama — free and private. Requires Ollama running (default http://localhost:11434).',
  },
];

const field = {
  width: '100%',
  background: '#0e1118',
  border: '1px solid #2a2e3a',
  borderRadius: 6,
  color: '#eee',
  padding: '8px 10px',
  fontSize: 13,
  marginBottom: 10,
  boxSizing: 'border-box' as const,
};

export function SettingsModal() {
  const activeModal = useGameStore((s) => s.activeModal);
  const closeModal = useGameStore((s) => s.closeModal);
  const llmSettings = useGameStore((s) => s.llmSettings);
  const setLLMSettings = useGameStore((s) => s.setLLMSettings);

  const [draft, setDraft] = useState<LLMSettings>(llmSettings);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  if (activeModal !== 'settings') return null;

  const needsKey = draft.provider === 'openai' || draft.provider === 'gemini';

  const handleTest = async () => {
    const body = llmRequestBody(draft);
    if (!body) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(CHAT_TEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setTestResult(
        data.success
          ? { ok: true, text: `Connected — ${data.model} responded: "${data.sample}"` }
          : { ok: false, text: data.error ?? 'Connection failed' },
      );
    } catch (err) {
      setTestResult({ ok: false, text: err instanceof Error ? err.message : 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    setLLMSettings(draft);
    closeModal();
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150 }}
      onClick={closeModal}
    >
      <div
        style={{ width: 560, maxWidth: '94vw', maxHeight: '88vh', overflowY: 'auto', background: '#12151d', border: '1px solid #2a2e3a', borderRadius: 12, padding: 22, color: '#ddd' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: 18 }}>⚙ Settings — Advisor Intelligence</h2>
          <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#888', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>
        <p style={{ fontSize: 12, color: '#889', marginTop: 4 }}>
          Choose what powers your cabinet's conversation. Country AI and the simulation itself always run on the
          deterministic engine — this setting only affects how advisors talk to you.
        </p>

        {PROVIDERS.map((p) => (
          <label
            key={p.id}
            style={{
              display: 'block',
              background: draft.provider === p.id ? '#1a2233' : '#161a24',
              border: `1px solid ${draft.provider === p.id ? '#2a6dd9' : '#2a2e3a'}`,
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 8,
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="llm-provider"
              checked={draft.provider === p.id}
              onChange={() => {
                setDraft({ ...draft, provider: p.id, model: p.id === 'builtin' ? '' : LLM_MODEL_DEFAULTS[p.id] ?? '' });
                setTestResult(null);
              }}
              style={{ marginRight: 8 }}
            />
            <b style={{ color: '#fff' }}>{p.name}</b>
            <div style={{ fontSize: 12, color: '#99a', marginTop: 4, marginLeft: 22 }}>{p.blurb}</div>
          </label>
        ))}

        {draft.provider !== 'builtin' && (
          <div style={{ background: '#161a24', borderRadius: 8, padding: 14, border: '1px solid #2a2e3a', marginTop: 4 }}>
            {needsKey && (
              <>
                <div style={{ fontSize: 11, color: '#778', marginBottom: 4 }}>API key</div>
                <input
                  type="password"
                  style={field}
                  placeholder={draft.provider === 'openai' ? 'sk-…' : 'AIza…'}
                  value={draft.apiKey}
                  onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
                />
              </>
            )}
            <div style={{ fontSize: 11, color: '#778', marginBottom: 4 }}>Model</div>
            <input
              style={field}
              placeholder={LLM_MODEL_DEFAULTS[draft.provider]}
              value={draft.model}
              onChange={(e) => setDraft({ ...draft, model: e.target.value })}
            />
            {draft.provider === 'ollama' && (
              <>
                <div style={{ fontSize: 11, color: '#778', marginBottom: 4 }}>Ollama URL</div>
                <input
                  style={field}
                  placeholder="http://localhost:11434"
                  value={draft.baseUrl}
                  onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
                />
              </>
            )}
            <button
              onClick={handleTest}
              disabled={testing || (needsKey && !draft.apiKey)}
              style={{ background: '#1a1e28', border: '1px solid #2a2e3a', color: '#cce', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 13 }}
            >
              {testing ? 'Testing…' : 'Test connection'}
            </button>
            {testResult && (
              <div style={{ marginTop: 8, fontSize: 12, color: testResult.ok ? '#7c7' : '#f88' }}>
                {testResult.ok ? '✓ ' : '✕ '}
                {testResult.text}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button
            onClick={() => setDraft(DEFAULT_LLM_SETTINGS)}
            style={{ background: 'none', border: '1px solid #2a2e3a', color: '#99a', borderRadius: 6, padding: '8px 14px', cursor: 'pointer' }}
          >
            Reset to built-in
          </button>
          <button
            onClick={handleSave}
            style={{ background: '#2a6dd9', border: 'none', color: '#fff', borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontWeight: 600 }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
