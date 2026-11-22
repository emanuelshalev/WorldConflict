import { SceneFrame } from '../scenes/SceneFrame';
import { sceneForNews } from '../scenes/kinds';
import { labelPoint, loadWorld, type WorldGeo } from '../scenes/worldGeo';
import { type GlobeArc, type GlobePin, TitleGlobe } from './TitleGlobe';
import { MapKey } from './MapKey';
import { CRISIS_KINDS, kindOf } from '../lib/crisisKind';
import { iconSvg } from '../lib/iconSvg';
import '../styles/title.css';
import { useEffect, useMemo, useState } from 'react';
import {
  IconBolt,
  IconChevronLeft,
  IconChevronRight,
  IconPencil,
  IconBuildingBank,
  IconCrown,
  IconFlame,
  IconPlayerPlay,
  IconSettings,
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
import { defaultSide } from '../lib/sides';
import { YourRecord } from './reveal/YourRecord';

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
    pitch: 'Govern any of 41 nations for four years. Survive scandals, shocks and rivals, then face the voters (or the Party).',
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
        // Today's crisis first (and its side), else the first flashpoint
        const today = c.daily && c.flashpoints.find((f) => f.id === c.daily?.flashpointId);
        if (today) {
          setFlashpointId(today.id);
          if (c.daily && today.playable.some((p) => p.countryId === c.daily?.countryId)) setPickedCountry(c.daily.countryId);
        } else if (c.flashpoints.length) setFlashpointId(c.flashpoints[0].id);
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

  // The world tonight: pins on the live crises, tints on the sides or the playable nations
  const [geo, setGeo] = useState<WorldGeo | null>(null);
  useEffect(() => {
    loadWorld().then(setGeo).catch(() => {});
  }, []);
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [wide, setWide] = useState(() => window.innerWidth > 900);
  useEffect(() => {
    const on = () => setWide(window.innerWidth > 900);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  // A crisis sits where it burns: between its two local sides (great powers that join from
  // afar, like the US over Taiwan, would drag the pin into the middle of an ocean)
  const pinAt = (ids: string[]): [number, number] | null => {
    if (!geo) return null;
    const local = ids.filter((id) => !['USA', 'CHN', 'RUS'].includes(id));
    const pts = (local.length ? local : ids)
      .map((id) => labelPoint(geo, id))
      .filter((x): x is [number, number] => !!x);
    if (!pts.length) return null;
    const [a, b] = pts;
    if (!b) return a;
    let dl = b[0] - a[0];
    if (dl > 180) dl -= 360;
    if (dl < -180) dl += 360;
    if (Math.hypot(dl, b[1] - a[1]) > 35) return a; // too far apart: the first side's capital region
    return [a[0] + dl / 2, (a[1] + b[1]) / 2];
  };
  const pins: GlobePin[] =
    mode === 'FLASHPOINT'
      ? flashpoints
          .flatMap((f): GlobePin[] => {
            const at = pinAt(f.playable.map((x) => x.countryId));
            const k = CRISIS_KINDS[kindOf(f.kind)];
            return at
              ? [{ id: f.id, at, label: f.title, gold: daily?.flashpointId === f.id, color: k.color, iconSvg: iconSvg(k.icon), sub: `${k.label} · ${f.playable.map((x) => flag(x.countryId)).join(' ')}` }]
              : [];
          })
      : [];
  // Rival lines: who is fighting or facing off in each crisis (the selected one brighter)
  const arcs: GlobeArc[] = geo
    ? flashpoints.flatMap((f) =>
        (f.rivals ?? []).flatMap(([a, b]) => {
          const pa = labelPoint(geo, a);
          const pb = labelPoint(geo, b);
          return pa && pb ? [{ from: pa, to: pb, color: CRISIS_KINDS[kindOf(f.kind)].color, on: usingFlashpoint && f.id === flashpointId }] : [];
        }),
      )
    : [];
  const liveWars = new Set(flashpoints.filter((f) => kindOf(f.kind) === 'WAR').flatMap((f) => (f.rivals ?? []).map((r) => [...r].sort().join('-')))).size;
  const DIFF_TINT = { STEADY: 'rgba(86,197,150,.55)', TOUGH: 'rgba(242,169,59,.55)', BRUTAL: 'rgba(229,56,59,.55)' } as const;
  const tint: Record<string, string> = Object.fromEntries(
    (usingFlashpoint && fp ? fp.playable.map((x) => [x.countryId, DIFF_TINT[x.difficulty]]) : countries.map((c) => [c.id, DIFF_TINT[c.difficulty].replace('.55', '.28')])),
  );
  const pickCrisis = (id: string) => {
    setFlashpointId(id);
    setMode('FLASHPOINT');
    const f = flashpoints.find((x) => x.id === id);
    // A new crisis selects its own first side (or today's), so the launch button names the card
    // that is highlighted, not a side kept from the last crisis
    setPickedCountry(defaultSide(f, daily));
    if (f) setFocus(pinAt(f.playable.map((x) => x.countryId)));
  };
  const pickNation = (id: string) => {
    if (!nationChoices.some((n) => n.id === id)) return;
    setCountryId(id);
    setFocus(pinAt([id]));
  };
  const fpIndex = flashpoints.findIndex((f) => f.id === flashpointId);
  const scene = usingFlashpoint && fp ? sceneForNews('WAR', `${fp.title} ${fp.tagline}`) : 'war_room';
  const tension = scenarios.find((x) => x.id === '2026')?.globalTension;
  const pips = (d: 'STEADY' | 'TOUGH' | 'BRUTAL') => '●'.repeat(DIFF_ORDER[d] + 1) + '○'.repeat(2 - DIFF_ORDER[d]);
  const [editName, setEditName] = useState(false);
  const scenario = scenarios.find((x) => x.id === scenarioId);

  return (
    <div className="ts2">
      <TitleGlobe arcs={arcs} pins={pins} selectedPin={usingFlashpoint ? flashpointId : null} onPin={pickCrisis} tint={tint} selectedCountry={countryId} onCountry={pickNation} focus={focus} padRight={wide ? 440 : 0} />
      <div className="ts2-vignette" aria-hidden />

      <header className="ts2-top">
        <div className="ts2-brand">
          <h1>World Conflict</h1>
          <small className="num">
            The world tonight · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            {tension !== undefined ? ` · tension ${tension}` : ''}
          </small>
        </div>
        <div className="ts2-status" aria-label="State of the world">
          <span>
            <b className="num">{flashpoints.length}</b> live crises
          </span>
          <span>
            <b className="num">{liveWars}</b> open wars
          </span>
          <span>
            <b className="num">{countries.length || 41}</b> nations
          </span>
          {tension !== undefined && (
            <span className="ts2-tension" title="Global tension: how close the world is to a wider war">
              Tension <i style={{ ['--t' as string]: `${tension}%` }} /> <b className="num">{tension}</b>
            </span>
          )}
        </div>
        <div className="ts2-actions">
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
          <button className="icon-btn" title={player ? `Signed in as ${player.name}` : 'Sign in to sync saves (optional)'} onClick={() => useGameStore.setState({ showLogin: true })}>
            <IconUserCircle size={18} />
          </button>
        </div>
      </header>

      <section className="ts2-left">
        <div className="ts2-dial" role="radiogroup" aria-label="How long do you have?">
          {MODES.map((m) => (
            <button key={m.id} role="radio" aria-checked={mode === m.id} className={mode === m.id ? 'on' : ''} onClick={() => setMode(m.id)}>
              <span className="ts2-dial-time num">{m.id === 'FLASHPOINT' ? '15 min' : m.id === 'TERM' ? '1 term' : 'Legacy'}</span>
              <span className="ts2-dial-name">
                {m.icon} {m.name}
              </span>
            </button>
          ))}
        </div>
        <p className="ts2-pitch">{MODES.find((m) => m.id === mode)?.pitch}</p>
        <h2 className="ts2-tag">
          {mode === 'FLASHPOINT' ? (
            <>
              Pick a fire.
              <br />
              <em>Put it out, or don't.</em>
            </>
          ) : (
            <>
              Pick a nation.
              <br />
              <em>Keep it standing.</em>
            </>
          )}
        </h2>
        {daily && (
          <button className="ts2-daily" onClick={playDaily} disabled={isLoading}>
            <span className="pulse-dot" />
            <span>
              <small className="num">Today's crisis · {daily.date}</small>
              <b>
                {flag(daily.countryId)} {daily.title}
              </b>
            </span>
            <IconFlame size={18} />
          </button>
        )}
        {/* Reveal agent block (WP7): your record and "Play this seed" */}
        <YourRecord />
      </section>

      <aside className="ts2-dossier" aria-label="Dossier">
        {usingFlashpoint && fp ? (
          <>
            <div className="ts2-scene">
              <SceneFrame key={fp.id} kind={scene} home={fp.playable[0]?.countryId} other={fp.playable[1]?.countryId} mood="bad" size="card" live kicker={`${fp.date ?? ''} · ${fp.turns} months`} headline={fp.title} />
            </div>
            <div className="ts2-crisis-nav">
              <button className="icon-btn" aria-label="Previous crisis" onClick={() => pickCrisis(flashpoints[(fpIndex - 1 + flashpoints.length) % flashpoints.length].id)}>
                <IconChevronLeft size={18} />
              </button>
              <select className="leader-input" value={fp.id} onChange={(e) => pickCrisis(e.target.value)} aria-label="Crisis">
                {flashpoints.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </select>
              <button className="icon-btn" aria-label="Next crisis" onClick={() => pickCrisis(flashpoints[(fpIndex + 1) % flashpoints.length].id)}>
                <IconChevronRight size={18} />
              </button>
            </div>
            <p className="ts2-hook">{fp.tagline}</p>
            <details className="ts2-more">
              <summary>What is happening</summary>
              <p>{fp.hook}</p>
            </details>
            <div className="ts2-label">Choose your side</div>
          </>
        ) : (
          <>
            <div className="ts2-label">The era</div>
            <div className="ts2-eras">
              {scenarios.map((x) => (
                <button key={x.id} className={scenarioId === x.id ? 'on' : ''} onClick={() => setScenarioId(x.id)}>
                  <b className="num">{x.startYear}</b>
                  <span>{x.name.replace(/^\d{4}:?\s*/, '')}</span>
                </button>
              ))}
            </div>
            {scenario && <p className="ts2-hook small">{scenario.description}</p>}
            <div className="ts2-label">Your nation · click the globe or the list</div>
          </>
        )}
        <div className={`ts2-sides ${usingFlashpoint ? '' : 'many'}`}>
          {nationChoices.map((n) => (
            <button key={n.id} className={`ts2-side d-${n.difficulty.toLowerCase()} ${countryId === n.id ? 'on' : ''}`} onClick={() => pickNation(n.id)}>
              <span className="ts2-side-flag">{flag(n.id)}</span>
              <span className="ts2-side-body">
                <b>{n.name}</b>
                {usingFlashpoint && <small>{n.sub}</small>}
              </span>
              <span className="ts2-pips num" title={DIFF_LABEL[n.difficulty]}>
                {pips(n.difficulty)}
              </span>
            </button>
          ))}
        </div>
        {(objective || country) && (
          <p className="ts2-brief">
            {objective ? (
              <>
                <b>{objective.title}.</b> {objective.briefing.split('. ').slice(0, 2).join('. ')}.
              </>
            ) : (
              country?.narrative.split('. ').slice(0, 2).join('. ')
            )}
          </p>
        )}
        <div className="ts2-launch">
          <div className="ts2-quiet">
            <div className="seg" title="Difficulty">
              {(['ANALYST', 'STATESMAN', 'STRONGMAN'] as Difficulty[]).map((d) => (
                <button key={d} className={difficulty === d ? 'on' : ''} onClick={() => setDifficulty(d)}>
                  {d === 'ANALYST' ? 'Story' : d === 'STATESMAN' ? 'Normal' : 'Hard'}
                </button>
              ))}
            </div>
            {editName ? (
              <input className="leader-input" autoFocus placeholder="Your name as leader" value={leaderName} maxLength={40} onChange={(e) => setLeaderName(e.target.value)} onBlur={() => setEditName(false)} />
            ) : (
              <button className="ts2-as" onClick={() => setEditName(true)}>
                As: {leaderName.trim() || 'the real leader'} <IconPencil size={13} />
              </button>
            )}
          </div>
          <button className={`wc-btn big ${resume ? '' : 'primary'} ts2-go`} disabled={!countryId || isLoading} onClick={launch}>
            {isLoading ? 'Briefing…' : `Take office${chosen ? ` as ${chosen.name}` : ''} ▸`}
          </button>
        </div>
      </aside>

      <MapKey mode={usingFlashpoint ? 'crisis' : 'nation'} />

      <div className="ts2-ticker" aria-hidden>
        <span className="tag">LIVE</span>
        <div className="track">
          {flashpoints.map((f) => (
            <span key={f.id}>
              ◆ {f.title}: {f.tagline}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
