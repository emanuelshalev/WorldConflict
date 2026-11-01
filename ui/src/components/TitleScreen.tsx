import { useEffect, useMemo, useState } from 'react';
import {
  IconBolt,
  IconBuildingBank,
  IconCrown,
  IconFlame,
  IconPlayerPlay,
  IconSettings,
  IconTargetArrow,
  IconUserCircle,
} from '@tabler/icons-react';
import {
  type DailyInfo,
  type Difficulty,
  type FlashpointInfo,
  type GameMode,
  type ScenarioInfo,
  fetchCatalog,
  lastSaveId,
  loadGame,
  startGame,
  useGameStore,
} from '../store/gameStore';
import { flag } from '../lib/format';

interface CountryInfo {
  id: string;
  name: string;
  regimeType: string;
  leaderTitle: string;
  difficulty: 'STEADY' | 'TOUGH' | 'BRUTAL';
  narrative: string;
}

const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');

const MODES: Array<{
  id: GameMode;
  icon: React.ReactNode;
  name: string;
  time: string;
  pitch: string;
  meta: string[];
}> = [
  {
    id: 'FLASHPOINT',
    icon: <IconBolt size={22} />,
    name: 'Flashpoint',
    time: '~10–15 MIN · 12 MONTHS',
    pitch: "Drop into a real crisis burning right now. One clear goal, a decision every month, a verdict at the end.",
    meta: ['One sitting', 'Stars & share card', 'Daily challenge'],
  },
  {
    id: 'TERM',
    icon: <IconBuildingBank size={22} />,
    name: 'One Term',
    time: '~45–60 MIN · 48 MONTHS',
    pitch: 'Govern any of 41 nations for four years. Survive scandals, shocks and rivals — then face the voters (or the Party).',
    meta: ['Autosaves', 'Election finale', 'Play in parts'],
  },
  {
    id: 'LEGACY',
    icon: <IconCrown size={22} />,
    name: 'Legacy',
    time: 'MULTI-DAY · 120 MONTHS',
    pitch: 'A decade in power. The full sandbox: wars, coups, nuclear brinkmanship and the long judgment of history.',
    meta: ['Autosaves', 'Full sandbox', 'History-book report'],
  },
];

const DIFF_LABEL = { STEADY: 'Steady', TOUGH: 'Tough', BRUTAL: 'Brutal' } as const;
const DIFF_ORDER = { STEADY: 0, TOUGH: 1, BRUTAL: 2 } as const;

export function TitleScreen() {
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [flashpoints, setFlashpoints] = useState<FlashpointInfo[]>([]);
  const [daily, setDaily] = useState<DailyInfo | null>(null);
  const [countries, setCountries] = useState<CountryInfo[]>([]);
  const [mode, setMode] = useState<GameMode>('FLASHPOINT');
  const [flashpointId, setFlashpointId] = useState<string | null>(null);
  const [scenarioId, setScenarioId] = useState<string>('');
  const [pickedCountry, setPickedCountry] = useState<string>('');
  const [difficulty, setDifficulty] = useState<Difficulty>('STATESMAN');
  const [leaderName, setLeaderName] = useState('');
  const isLoading = useGameStore((s) => s.isLoading);
  const player = useGameStore((s) => s.player);
  const openModal = useGameStore((s) => s.openModal);
  const resume = lastSaveId();

  useEffect(() => {
    fetchCatalog()
      .then((c) => {
        setScenarios([...c.scenarios].sort((a, b) => b.startYear - a.startYear));
        setFlashpoints(c.flashpoints);
        setDaily(c.daily);
        if (c.scenarios.length) setScenarioId([...c.scenarios].sort((a, b) => b.startYear - a.startYear)[0].id);
        if (c.flashpoints.length) setFlashpointId(c.flashpoints[0].id);
      })
      .catch(() => useGameStore.getState().setError('Cannot reach the game server'));
    fetch(`${API_BASE}/countries`)
      .then((r) => r.json())
      .then((d) => d.success && setCountries(d.countries))
      .catch(() => {});
  }, []);

  const fp = flashpoints.find((f) => f.id === flashpointId) ?? null;
  const usingFlashpoint = mode === 'FLASHPOINT' && !!fp;
  const nationChoices = useMemo(() => {
    if (usingFlashpoint && fp) {
      return fp.playable.map((p) => ({
        id: p.countryId,
        name: countries.find((c) => c.id === p.countryId)?.name ?? p.countryId,
        sub: p.role,
        difficulty: p.difficulty,
      }));
    }
    return [...countries]
      .sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty] || a.name.localeCompare(b.name))
      .map((c) => ({ id: c.id, name: c.name, sub: c.leaderTitle, difficulty: c.difficulty }));
  }, [usingFlashpoint, fp, countries]);

  // Keep the selection valid when the crisis (and its playable sides) changes
  const countryId = nationChoices.some((n) => n.id === pickedCountry)
    ? pickedCountry
    : (nationChoices[0]?.id ?? '');
  const setCountryId = setPickedCountry;

  const chosen = nationChoices.find((n) => n.id === countryId);
  const country = countries.find((c) => c.id === countryId);
  const objective = usingFlashpoint && fp ? fp.objectives[countryId] : null;

  const launch = () =>
    startGame({
      mode,
      playerCountryId: countryId,
      flashpointId: usingFlashpoint ? fp?.id : undefined,
      scenarioId: usingFlashpoint ? undefined : scenarioId,
      difficulty,
      leaderName: leaderName.trim() || undefined,
    });

  const playDaily = () =>
    daily &&
    startGame({
      mode: 'FLASHPOINT',
      flashpointId: daily.flashpointId,
      playerCountryId: daily.countryId,
      difficulty: 'STATESMAN',
      daily: true,
    });

  return (
    <div className="title-screen">
      <div className="title-inner">
        <div className="title-top">
          <div className="brand">
            <img src="/favicon.svg" width={40} height={40} alt="" />
            <div>
              <h1>WORLD CONFLICT</h1>
              <small>Situation room · November 2026</small>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {resume && (
              <button className="wc-btn primary" onClick={() => loadGame(resume)}>
                <IconPlayerPlay size={16} /> Continue
              </button>
            )}
            <button className="wc-btn ghost" onClick={() => openModal('saveLoad')}>
              Saved games
            </button>
            <button className="icon-btn" title="AI & settings" onClick={() => openModal('settings')}>
              <IconSettings size={18} />
            </button>
            <button
              className="icon-btn"
              title={player ? `Signed in as ${player.name}` : 'Sign in to sync saves (optional)'}
              onClick={() => useGameStore.setState({ showLogin: true })}
            >
              <IconUserCircle size={18} />
            </button>
          </div>
        </div>

        <div className="hero">
          <div>
            <h2>
              Lead your nation.
              <br />
              <em>Face the consequences.</em>
            </h2>
            <p>
              Wars in Europe and the Gulf, a blockade in the Caribbean, a new supreme leader in
              Tehran. Every country is run by an AI with its own history, red lines and
              half-wrong intelligence. Step in — and see if you can do better.
            </p>
          </div>
          <div className="poem">
            This is your captain calling with an urgent warning
            <br />
            We're above the Gulf of Arabia, altitude is falling
            <br />
            And I can't keep her up, there's no time for thinking
            <br />
            All hands on deck, this bird is sinking.
          </div>
        </div>

        {daily && (
          <div className="daily">
            <span className="pulse-dot" />
            <div style={{ flex: 1 }}>
              <div className="display" style={{ fontSize: 13, color: 'var(--text-2)' }}>
                Daily flashpoint · {daily.date}
              </div>
              <b style={{ fontSize: 17 }}>
                {flag(daily.countryId)} {daily.title}
              </b>
              <div style={{ color: 'var(--text-3)', fontSize: 12 }}>
                Same world for everyone today. Compare your stars.
              </div>
            </div>
            <button className="wc-btn primary" onClick={playDaily} disabled={isLoading}>
              <IconFlame size={16} /> Play today's crisis
            </button>
          </div>
        )}

        <div className="section-label">1 · How long do you have?</div>
        <div className="mode-grid">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={`mode-card ${mode === m.id ? 'active' : ''}`}
              onClick={() => setMode(m.id)}
            >
              <div className="mode-time">{m.time}</div>
              <h3 style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {m.icon} {m.name}
              </h3>
              <p>{m.pitch}</p>
              <div className="mode-meta">
                {m.meta.map((x) => (
                  <span className="chip" key={x}>
                    {x}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        {mode === 'FLASHPOINT' && flashpoints.length > 0 && (
          <>
            <div className="section-label">2 · Pick a crisis</div>
            <div className="fp-grid">
              {flashpoints.map((f) => (
                <button
                  key={f.id}
                  className={`fp-card ${flashpointId === f.id ? 'active' : ''}`}
                  onClick={() => setFlashpointId(f.id)}
                >
                  <div className="fp-date">
                    {f.date ?? ''} · {f.turns} MONTHS
                  </div>
                  <h4>{f.title}</h4>
                  <p>{f.tagline}</p>
                  <div style={{ marginTop: 8, fontSize: 18 }}>
                    {f.playable.map((p) => flag(p.countryId)).join(' ')}
                  </div>
                </button>
              ))}
            </div>
            {fp && (
              <p style={{ color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.55, marginTop: 12 }}>
                <IconTargetArrow size={14} style={{ verticalAlign: -2 }} /> {fp.hook}
              </p>
            )}
          </>
        )}

        {mode !== 'FLASHPOINT' && scenarios.length > 0 && (
          <>
            <div className="section-label">2 · Choose your era</div>
            <div className="seg">
              {scenarios.map((s) => (
                <button key={s.id} className={scenarioId === s.id ? 'on' : ''} onClick={() => setScenarioId(s.id)}>
                  {s.name}
                </button>
              ))}
            </div>
            <p style={{ color: 'var(--text-2)', fontSize: 13.5, maxWidth: 760 }}>
              {scenarios.find((s) => s.id === scenarioId)?.description}
            </p>
          </>
        )}

        <div className="section-label">
          {mode === 'FLASHPOINT' && flashpoints.length > 0 ? '3 · Choose your side' : '3 · Choose your nation'}
        </div>
        <div className="nation-grid">
          {nationChoices.map((n) => (
            <button
              key={n.id}
              className={`nation ${countryId === n.id ? 'active' : ''}`}
              onClick={() => setCountryId(n.id)}
            >
              <b>
                {flag(n.id)} {n.name}
              </b>
              <span>{n.sub}</span>
              <span className={`chip ${n.difficulty.toLowerCase()}`} style={{ alignSelf: 'flex-start' }}>
                {DIFF_LABEL[n.difficulty]}
              </span>
            </button>
          ))}
        </div>

        <div className="launch-bar">
          <div className="summary">
            <b>
              {chosen ? `${flag(chosen.id)} ${chosen.name}` : 'Pick a nation'}
              {usingFlashpoint && fp ? ` — ${fp.title}` : ''}
            </b>
            <p>
              {objective
                ? `${objective.title}: ${objective.briefing}`
                : (country?.narrative.split('. ').slice(0, 2).join('. ') ?? '')}
            </p>
          </div>
          <div className="seg" title="Difficulty">
            {(['ANALYST', 'STATESMAN', 'STRONGMAN'] as Difficulty[]).map((d) => (
              <button key={d} className={difficulty === d ? 'on' : ''} onClick={() => setDifficulty(d)}>
                {d === 'ANALYST' ? 'Story' : d === 'STATESMAN' ? 'Normal' : 'Hard'}
              </button>
            ))}
          </div>
          <input
            className="leader-input"
            placeholder="Your name (optional)"
            value={leaderName}
            maxLength={40}
            onChange={(e) => setLeaderName(e.target.value)}
          />
          <button className="wc-btn primary big" disabled={!countryId || isLoading} onClick={launch}>
            {isLoading ? 'Briefing…' : 'Take office ▸'}
          </button>
        </div>
      </div>
    </div>
  );
}
