/* World Conflict landing page. Plain JS, no dependencies.
 *
 * Content lives in two places:
 *  - content/parallels.json  (real events, written by the publishing side; authoritative order)
 *  - MEDIA below             (which game footage and caption goes with each event)
 * To add or swap a parallel, edit the JSON and add a MEDIA entry with the same key
 * (the entry's flashpointId, or "europe-unrest" for the One Term France entry).
 */
// ---------------------------------------------------------------------------
// SITE CONFIG: the only values to edit before and after launch.
//  playUrl     the hosted game. While null, the page shows an "In development" status line.
//              Set it and "Take office ▸" links appear everywhere.
//  dailyUrl    optional Daily Flashpoint link (falls back to playUrl when playUrl is set).
//  signupUrl   waitlist endpoint. With signupType 'form' it is the form's POST action
//              (Buttondown, Formspree, Tally...); with 'link' it is a page the button opens.
//              While null, no form is shown.
//  signupField name of the email field the provider expects (usually 'email').
//  repoUrl     optional "Follow development" / "Source on GitHub" link (hidden while null).
//  siteUrl     the deployed base URL, used to keep share-image URLs absolute.
//  pressEmail  contact address shown on press.html (hidden while null).
// ---------------------------------------------------------------------------
const SITE = {
  playUrl: null,
  dailyUrl: null,
  signupUrl: null,
  signupType: 'form',
  signupField: 'email',
  repoUrl: null,
  siteUrl: 'https://emanuelshalev.github.io/WorldConflict/',
  pressEmail: null,
};

(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const narrow = () => window.innerWidth < 760;

  // ---------- Apply SITE config to CTAs and meta tags ----------
  (function applySiteConfig() {
    const show = (sel, on) => document.querySelectorAll(sel).forEach((el) => { el.hidden = !on; });
    const signup = !!SITE.signupUrl;
    if (SITE.playUrl) {
      document.querySelectorAll('.js-play-link').forEach((a) => { a.href = SITE.playUrl; a.hidden = false; });
    }
    const daily = SITE.dailyUrl || SITE.playUrl;
    document.querySelectorAll('.js-daily').forEach((a) => { if (daily) { a.href = daily; a.hidden = false; } });
    document.querySelectorAll('.js-repo').forEach((a) => { if (SITE.repoUrl) { a.href = SITE.repoUrl; a.hidden = false; } });
    if (signup && SITE.signupType === 'link') {
      document.querySelectorAll('.js-signup').forEach((f) => {
        const a = document.createElement('a');
        a.className = 'btn btn-primary btn-lg';
        a.href = SITE.signupUrl;
        a.textContent = 'Get early access';
        f.replaceWith(a);
      });
      document.querySelectorAll('.js-join').forEach((a) => { a.href = SITE.signupUrl; });
    } else if (signup) {
      document.querySelectorAll('.js-signup').forEach((f) => {
        f.action = SITE.signupUrl;
        f.querySelector('input').name = SITE.signupField || 'email';
        f.hidden = false;
      });
    }
    show('.js-signup-note', signup);
    show('.js-join', signup && !SITE.playUrl);
    show('.js-status', !signup && !SITE.playUrl);
    if (SITE.playUrl) show('.site-head .js-join', false);
    if (SITE.siteUrl) {
      const abs = new URL('assets/og-image.jpg', SITE.siteUrl).href;
      document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach((m) => m.setAttribute('content', abs));
    }
  })();

  // Press page: fill the contact line, then stop (the rest of this file drives index.html).
  document.querySelectorAll('.js-press-contact').forEach((p) => {
    if (SITE.pressEmail) p.innerHTML = `Press contact: <a href="mailto:${SITE.pressEmail}">${SITE.pressEmail}</a>`;
  });
  if (!document.getElementById('hero')) return;

  // ---------- Game footage and captions per parallel ----------
  // short: the one-line version of realEvent used on the wall (must stay within realEvent).
  // video: base path without extension (.webm + .mp4); mobile: a 4:5 "-m" variant exists.
  const MEDIA = {
    'hormuz-convoy': {
      short: 'US–Israeli strikes on Iran open an undeclared war and a naval blockade.',
      placeShort: 'Tehran', gameDate: 'Nov 2026',
      game: 'Hormuz Convoy', mode: 'Flashpoint',
      video: 'assets/video/wall-hormuz', poster: 'assets/img/wall-hormuz', mobile: true,
      caption: 'A burning tanker, a midterm clock, and uranium no inspector has seen.',
      fiction: 'The tanker strike and the Isfahan satellite images are scenario events.',
    },
    'ceasefire-or-collapse': {
      short: 'The front barely moves. A local ceasefire around Oleshky, but no peace.',
      placeShort: 'Kherson front', gameDate: 'Nov 2026',
      game: 'Ceasefire or Collapse', mode: 'Flashpoint',
      video: 'assets/video/wall-ukraine', poster: 'assets/img/wall-ukraine', mobile: true,
      caption: 'Washington arrives with a map. Winter arrives with the drones.',
    },
    'europe-unrest': {
      short: 'Around 320,000 march in France. Unions call a general strike for 5 November.',
      placeShort: 'Paris', gameDate: 'One Term',
      game: 'General strike', mode: 'One Term · France',
      video: 'assets/video/wall-france', poster: 'assets/img/wall-france', mobile: true,
      caption: '“General strike paralyses France” lands on your desk: meet their demands, break the strike, or mediate, while the election clock runs.',
    },
    quarantine: {
      short: 'PLA drills rehearse sealing off Keelung and Kaohsiung.',
      placeShort: 'Taiwan Strait', gameDate: 'Dec 2026',
      game: 'Quarantine', mode: 'Flashpoint',
      video: 'assets/video/wall-taiwan', poster: 'assets/img/wall-taiwan', mobile: true,
      caption: 'Eleven days of gas, and a coast guard that “inspects” every tanker.',
      fiction: 'The quarantine, the boardings and the warning shots are scenario fiction.',
    },
    'caracas-after-maduro': {
      short: 'A US raid captures Nicolás Maduro. He is flown to New York.',
      placeShort: 'Caracas', gameDate: 'Nov 2026',
      game: 'Caracas After Maduro', mode: 'Flashpoint',
      video: null, poster: 'assets/img/wall-caracas',
      caption: 'Survive a protectorate, or turn a raid into a transition.',
    },
    'bab-al-mandab-burning': {
      short: 'Houthi forces seize Mokha, 80 km north of Bab al-Mandab.',
      placeShort: 'Mokha', gameDate: 'Nov 2026',
      game: 'Bab al-Mandab Burning', mode: 'Flashpoint',
      video: 'assets/video/wall-bab', poster: 'assets/img/wall-bab',
      caption: 'Two chokepoints, one war, and the Gulf’s last sea exit.',
    },
    'scarborough-line': {
      short: 'Water cannon at Scarborough Shoal, two days running.',
      placeShort: 'Scarborough Shoal', gameDate: 'Nov 2026',
      game: 'Scarborough Line', mode: 'Flashpoint',
      video: null, poster: 'assets/img/wall-scarborough',
      caption: 'One ramming too far, and a treaty that has to mean something.',
      fiction: 'The sailor’s death in the scenario is fiction: the real incidents stopped short of lethal force.',
    },
    'fire-on-the-nile': {
      short: 'After an 18-month siege, the RSF takes El Fasher.',
      placeShort: 'El Fasher', gameDate: 'Nov 2026',
      game: 'Fire on the Nile', mode: 'Flashpoint',
      video: null, poster: 'assets/img/wall-nile',
      caption: 'Hold El Obeid, keep Cairo with you, and keep Sudan in one piece.',
    },
    'water-war': {
      short: 'Four days of drone and missile strikes between India and Pakistan, then a ceasefire.',
      placeShort: 'Kashmir', gameDate: 'Nov 2026',
      game: 'Water War', mode: 'Flashpoint',
      video: 'assets/video/wall-water', poster: 'assets/img/wall-water',
      caption: 'India holds back the Chenab. Pakistan has said that is an act of war.',
      fiction: 'The scenario’s opening attack on pilgrims near Jammu is fictional.',
    },
  };

  // Locator maps (assets/loc/*.svg and *-dark.svg, drawn from Natural Earth). Pins are % of the box.
  const LOC = {
    'hormuz-convoy': { r: 0.942, pins: [[55, 24.3], [72.5, 59.2]] },
    'ceasefire-or-collapse': { r: 1.223, pins: [[52.2, 64.5], [43.8, 35]] },
    'europe-unrest': { r: 0.995, pins: [[37, 42.8], [64.3, 18.2], [59.1, 50.7], [73.2, 79.5]] },
    quarantine: { r: 1.227, pins: [[57.2, 38.2], [51.2, 52.1]] },
    'caracas-after-maduro': { r: 1.314, pins: [[59.7, 47.9]] },
    'bab-al-mandab-burning': { r: 1.192, pins: [[51, 60.4]] },
    'scarborough-line': { r: 1.17, pins: [[49, 39.2]] },
    'fire-on-the-nile': { r: 1.24, pins: [[40.5, 47.1]] },
    'water-war': { r: 1.125, pins: [[58.9, 30], [55, 42.3]] },
  };

  const INTRO_PAIRS = 4; // Iran, Ukraine, France, Taiwan (parallels.json order)
  const keyOf = (e) => e.flashpointId || (e.mode === 'TERM' && (e.countries || []).includes('FRA') ? 'europe-unrest' : `entry-${e.order}`);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtDate = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const sleep = (ms, token) => new Promise((res, rej) => {
    const t = setTimeout(() => (token && token.cancelled ? rej(new Error('cancel')) : res()), ms);
    if (token) token.timers.push(t);
  });

  async function loadParallels() {
    try {
      const r = await fetch('content/parallels.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } catch {
      const el = document.getElementById('parallels-fallback');
      try { return JSON.parse(el.textContent); } catch { return { entries: [] }; }
    }
  }

  // ---------- Shared builders ----------
  function locatorHTML(key, dark = false) {
    const loc = LOC[key];
    if (!loc) return '';
    const pins = loc.pins.map((p, i) => `<span class="pin" style="left:${p[0]}%;top:${p[1]}%;--pi:${i}"></span>`).join('');
    const darkImg = dark ? `<img class="map-dark" src="assets/loc/${key}-dark.svg" alt="" loading="lazy" decoding="async" />` : '';
    return `<div class="rc-map" style="--r:${loc.r}"><img class="map-light" src="assets/loc/${key}.svg" alt="" loading="lazy" decoding="async" />${darkImg}${pins}</div>`;
  }
  const posterFor = (m, mobile) => `${m.poster}${mobile && m.mobile ? '-m' : ''}.jpg`;
  const videoBase = (m, mobile) => (m.video ? `${m.video}${mobile && m.mobile ? '-m' : ''}` : null);

  function ensureSources(v) {
    if (v.dataset.loaded) return;
    const base = v.dataset.base;
    if (base) {
      v.innerHTML = `<source src="${base}.webm" type="video/webm"><source src="${base}.mp4" type="video/mp4">`;
    } else {
      v.querySelectorAll('source[data-src]').forEach((s) => { s.src = s.dataset.src; });
    }
    v.dataset.loaded = '1';
    v.load();
  }
  function playVideo(v, restart) {
    if (!v || reduceMotion) return;
    ensureSources(v);
    if (restart) { try { v.currentTime = 0; } catch { /* not ready */ } }
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  }
  const pauseVideo = (v) => { if (v && !v.paused) v.pause(); };

  // =========================================================
  // HERO: the newsroom wall
  // =========================================================
  const hero = document.getElementById('hero');
  const wall = document.getElementById('wall');
  const slate = document.getElementById('slate');
  const coldOpen = document.getElementById('coldOpen');
  const heroCopy = document.getElementById('heroCopy');
  const skipBtn = document.getElementById('skipIntro');
  let tiles = [];
  let pairs = []; // first occurrence on the wall of each intro pair: {real, game, entry}
  let token = null;
  let geom = null;
  let lastW = window.innerWidth;

  function buildWall(entries) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mobile = narrow();
    const cols = mobile ? 1 : 4;
    const gap = mobile ? 14 : 10;
    const tw = Math.round(mobile ? vw * 0.86 : (vw * 1.12) / cols);
    const th = Math.round(mobile ? tw * 1.25 : (tw * 9) / 16);
    const usable = entries.filter((e) => MEDIA[keyOf(e)]);
    const perRow = mobile ? 0.5 : cols / 2;
    const rows = mobile ? Math.max(INTRO_PAIRS * 2 + 2, Math.ceil((vh * 1.2) / (th + gap))) : Math.max(3, Math.ceil((vh * 1.15) / (th + gap)));
    wall.style.setProperty('--cols', cols);
    wall.style.setProperty('--tw', `${tw}px`);
    wall.style.setProperty('--th', `${th}px`);
    wall.style.setProperty('--gap', `${gap}px`);
    wall.classList.toggle('portrait', mobile);
    wall.innerHTML = '';
    tiles = [];
    pairs = [];
    const nPairs = mobile ? Math.ceil(rows / 2) : rows * perRow;
    for (let n = 0; n < nPairs; n++) {
      const entry = usable[n % usable.length];
      const row = mobile ? n : Math.floor(n / perRow);
      const flip = !mobile && (row + (n % perRow)) % 2 === 1 && n >= INTRO_PAIRS * 2;
      const real = makeTile('real', entry, mobile);
      const game = makeTile('game', entry, mobile);
      if (flip) wall.append(game.el, real.el); else wall.append(real.el, game.el);
      tiles.push(real, game);
      if (pairs.length < INTRO_PAIRS && !pairs.some((p) => p.entry === entry) && usable.indexOf(entry) < INTRO_PAIRS) {
        pairs.push({ real, game, entry });
      }
    }
    pairs.sort((a, b) => usable.indexOf(a.entry) - usable.indexOf(b.entry));
    const W = mobile ? tw + 2 * gap : cols * tw + (cols - 1) * gap + 2 * gap;
    const H = rows * th + (rows - 1) * gap + 2 * gap;
    geom = { vw, vh, W, H, tw, th, gap, mobile };
    setWallTransform(baseTransform(1.04), false);
  }

  function makeTile(kind, entry, mobile) {
    const key = keyOf(entry);
    const m = MEDIA[key];
    const el = document.createElement('div');
    el.className = `tile ${kind}`;
    if (kind === 'real') {
      el.innerHTML = `
        <div class="real-card">
          <div class="rc-top"><span class="rc-tag">Real event</span><span>${esc(m.placeShort)}</span></div>
          <div class="rc-body">
            <div class="rc-text">
              <div class="rc-date">${fmtDate(entry.date)}</div>
              <div class="rc-head">${esc(m.short)}</div>
              <div class="rc-place">${esc(entry.place)}</div>
            </div>
            ${locatorHTML(key, true)}
          </div>
          <div class="rc-foot"><span>${esc(m.mode)} · ${esc(m.game)}</span></div>
        </div>`;
    } else {
      const base = videoBase(m, mobile);
      const poster = posterFor(m, mobile);
      el.innerHTML = base
        ? `<video muted loop playsinline preload="none" poster="${poster}" data-base="${base}"></video><span class="tag">In game · ${esc(m.game)}</span>`
        : `<img src="${poster}" alt="" loading="lazy" decoding="async" /><span class="tag">In game · ${esc(m.game)}</span>`;
    }
    return { el, kind, key, entry, m, video: el.querySelector('video') };
  }

  // The camera frames a region of the wall inside the band between the header/slate and the lower third.
  function stageBand() {
    const headH = 60;
    const top = headH + (geom.mobile ? 64 : 84);
    const copyTop = heroCopy.getBoundingClientRect().top - hero.getBoundingClientRect().top;
    const bottom = Math.max(top + 160, copyTop - 10);
    return { top, h: bottom - top };
  }
  function baseTransform(scale = 1) {
    const { vw, vh, W, H } = geom;
    return { x: (vw - W * scale) / 2, y: (vh - H * scale) / 2, s: scale };
  }
  function frameRect(x, y, w, h) {
    const band = stageBand();
    const s = Math.min((geom.vw * (geom.mobile ? 0.92 : 0.94)) / w, band.h / h);
    return { x: geom.vw / 2 - s * (x + w / 2), y: band.top + band.h / 2 - s * (y + h / 2), s };
  }
  const frameTile = (t) => frameRect(t.el.offsetLeft, t.el.offsetTop, geom.tw, geom.th);
  function framePair(p) {
    const x = Math.min(p.real.el.offsetLeft, p.game.el.offsetLeft);
    return frameRect(x, p.real.el.offsetTop, geom.tw * 2 + geom.gap, geom.th);
  }
  function setWallTransform(t, animate = true) {
    wall.style.transition = animate ? '' : 'none';
    wall.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.s})`;
    if (!animate) { void wall.offsetWidth; wall.style.transition = ''; }
  }

  function setSlate(p, phase) {
    if (!p) { slate.classList.remove('on', 'game'); return; }
    slate.querySelector('.slate-date').textContent = fmtDate(p.entry.date);
    slate.querySelector('.slate-gdate').textContent = p.real.m.gameDate;
    slate.querySelector('.slate-place').textContent = phase === 'game' ? `${p.real.m.mode} · ${p.real.m.game}` : p.entry.place;
    slate.classList.add('on');
    slate.classList.toggle('game', phase === 'game');
  }

  function resetPairs() {
    tiles.forEach((t) => { t.el.classList.remove('focus', 'inverted', 'pre'); pauseVideo(t.video); });
  }
  function showPair(p, phase, animate = true) {
    tiles.forEach((t) => {
      const on = t === p.real || t === p.game;
      t.el.classList.toggle('focus', on);
      if (!on) { t.el.classList.remove('inverted', 'pre'); pauseVideo(t.video); }
    });
    wall.classList.add('zoomed');
    hero.classList.add('framing');
    if (phase === 'real') {
      p.real.el.classList.remove('inverted');
      p.game.el.classList.add('pre');
      setWallTransform(geom.mobile ? frameTile(p.real) : framePair(p), animate);
    } else {
      p.real.el.classList.add('inverted');
      p.game.el.classList.remove('pre');
      if (geom.mobile) {
        // Let the card invert in view first, then pan down to the game screen.
        const pan = () => { if (p.game.el.classList.contains('focus')) setWallTransform(frameTile(p.game), animate); };
        if (animate) setTimeout(pan, 700); else pan();
      } else setWallTransform(framePair(p), animate);
      playVideo(p.game.video, true);
    }
    setSlate(p, phase);
  }

  async function runIntro() {
    if (token) { token.cancelled = true; token.timers.forEach(clearTimeout); }
    token = { cancelled: false, timers: [] };
    const tk = token;
    document.body.classList.remove('intro-done');
    hero.classList.remove('ended', 'framing');
    wall.classList.remove('ended', 'zoomed');
    resetPairs();
    setWallTransform(baseTransform(1.1), false);
    try {
      await sleep(60, tk);
      setWallTransform(baseTransform(1.0));
      await sleep(240, tk);
      coldOpen.classList.add('on');
      await sleep(2000, tk);
      coldOpen.classList.remove('on');
      hero.classList.add('framing');
      await sleep(500, tk);
      for (const p of pairs) {
        showPair(p, 'real');
        await sleep(2300, tk);
        showPair(p, 'game');
        await sleep(2200, tk);
      }
      endIntro();
    } catch { /* cancelled */ }
  }

  function endIntro() {
    if (token) { token.cancelled = true; token.timers.forEach(clearTimeout); }
    coldOpen.classList.remove('on');
    setSlate(null);
    resetPairs();
    wall.classList.remove('zoomed');
    wall.classList.add('ended');
    hero.classList.remove('framing');
    hero.classList.add('ended');
    document.body.classList.add('intro-done');
    setWallTransform(baseTransform(1.02));
    // Nothing keeps playing behind the dimmed wall.
    tiles.forEach((t) => pauseVideo(t.video));
  }

  skipBtn.addEventListener('click', () => {
    endIntro();
    const target = heroCopy.querySelector('.js-signup:not([hidden]) input, .js-play-link:not([hidden]), .js-watch');
    if (target) target.focus({ preventScroll: true });
  });
  document.querySelectorAll('.js-watch').forEach((b) => b.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    runIntro();
    skipBtn.focus({ preventScroll: true });
  }));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !hero.classList.contains('ended')) endIntro(); });

  // Stop the intro (and its videos) once the hero leaves the screen.
  new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) {
      if (!hero.classList.contains('ended')) endIntro();
      tiles.forEach((t) => pauseVideo(t.video));
    }
  }, { threshold: 0.05 }).observe(hero);

  // Mobile browsers fire resize for the URL bar and on load: ignore anything under 40px wide.
  let resizeT;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      if (Math.abs(window.innerWidth - lastW) < 40) {
        if (hero.classList.contains('ended') && geom) {
          geom.vw = window.innerWidth; geom.vh = window.innerHeight;
          setWallTransform(baseTransform(1.02), false);
        }
        return;
      }
      lastW = window.innerWidth;
      buildWall(ENTRIES);
      endIntro();
    }, 200);
  });

  // Reduced motion: no autoplay; a manual step-through of the pairs instead.
  function setupStepper() {
    const box = document.getElementById('stepper');
    const label = box.querySelector('.stepper-label');
    const total = pairs.length * 2;
    let i = -1;
    const render = () => {
      if (i < 0) {
        endIntro();
        label.textContent = `Step through the ${pairs.length} parallels`;
        return;
      }
      const p = pairs[Math.floor(i / 2)];
      const phase = i % 2 ? 'game' : 'real';
      hero.classList.remove('ended');
      wall.classList.remove('ended');
      showPair(p, phase, false);
      label.textContent = `${i + 1} of ${total}: ${phase === 'real' ? `Real, ${fmtDate(p.entry.date)}, ${p.entry.place}` : `In game, ${p.real.m.game}`}`;
    };
    box.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-step]');
      if (!b) return;
      i = Math.max(-1, Math.min(total - 1, i + Number(b.dataset.step)));
      render();
    });
    box.hidden = false;
    render();
  }

  // =========================================================
  // PARALLELS timeline: three pairs, the rest behind "See all"
  // =========================================================
  function pairHTML(e) {
    const key = keyOf(e);
    const m = MEDIA[key];
    if (!m) return '';
    const label = `Game screen from ${m.game}: ${m.caption}`;
    const mob = narrow();
    const media = m.video
      ? `<video class="lazy-video" muted loop playsinline preload="none" poster="${posterFor(m, mob)}" aria-label="${esc(label)}" data-base="${videoBase(m, mob)}"></video>`
      : `<img src="${m.poster}.jpg" alt="${esc(label)}" loading="lazy" decoding="async" />`;
    return `
      <li class="pair">
        <article class="p-real paper-card" aria-label="Real event, ${esc(fmtDate(e.date))}">
          <span class="pc-label">Real</span>
          <p class="pc-date"><time datetime="${e.date}">${fmtDate(e.date)}</time></p>
          <p class="pc-place">${esc(e.place)}</p>
          <p class="pc-fact">${esc(e.realEvent)}</p>
          <div class="rc-wrap">${locatorHTML(key)}</div>
        </article>
        <article class="p-game game-card${m.mobile ? ' has-portrait' : ''}" aria-label="In the game: ${esc(m.game)}">
          <div class="gc-media"><span class="gc-tag">In game</span>${media}</div>
          <div class="gc-body">
            <p class="gc-mode">${esc(m.mode)}</p>
            <h3>${esc(m.game)}</h3>
            <p>${esc(m.caption)}</p>
            ${m.fiction ? `<p class="fine" style="margin-top:10px">${esc(m.fiction)}</p>` : ''}
          </div>
        </article>
      </li>`;
  }
  const pairIO = new IntersectionObserver((ens) => {
    ens.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      const map = en.target.querySelector('.rc-map');
      if (map) map.classList.add('drop');
      pairIO.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -15% 0px' });
  function activate(list) {
    list.querySelectorAll('.pair').forEach((p) => pairIO.observe(p));
    list.querySelectorAll('.lazy-video').forEach(observeVideo);
  }
  function buildTimeline(entries) {
    const first = document.getElementById('pairs');
    const more = document.getElementById('pairsMore');
    const btn = document.getElementById('morePairs');
    const shown = entries.filter((e) => MEDIA[keyOf(e)]);
    first.innerHTML = shown.slice(0, 3).map(pairHTML).join('');
    more.innerHTML = shown.slice(3).map(pairHTML).join('');
    btn.textContent = `See all ${shown.length} parallels`;
    btn.hidden = shown.length <= 3;
    activate(first);
    btn.addEventListener('click', () => {
      const open = more.hidden;
      more.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Show fewer' : `See all ${shown.length} parallels`;
      if (open) activate(more);
      else document.getElementById('parallels').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  // =========================================================
  // Generic: reveals, teletype, glitch, lazy videos, parallax, rail
  // =========================================================
  function setupTeletype() {
    document.querySelectorAll('.teletype').forEach((h) => {
      const text = h.textContent.trim();
      h.setAttribute('aria-label', text);
      let i = 0;
      h.innerHTML = text.split(' ').map((w) => `<span aria-hidden="true" style="white-space:nowrap">${[...w].map((c) => `<span class="ch" style="--i:${i++}">${esc(c)}</span>`).join('')}</span>`).join(' ');
    });
  }
  const revealIO = new IntersectionObserver((ens) => {
    ens.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.classList.add('in');
      el.querySelectorAll('.teletype').forEach((t) => t.classList.add('typed'));
      el.querySelectorAll('.glitch').forEach((g) => g.classList.add('glitching'));
      revealIO.unobserve(el);
    });
  }, { rootMargin: '0px 0px -10% 0px' });

  const videoIO = new IntersectionObserver((ens) => {
    ens.forEach((en) => (en.isIntersecting ? playVideo(en.target) : pauseVideo(en.target)));
  }, { threshold: 0.35 });
  function observeVideo(v) {
    if (reduceMotion) {
      v.controls = true; // no autoplay: people start clips themselves
      v.preload = 'none';
      ensureSources(v);
      return;
    }
    videoIO.observe(v);
  }

  function setupScrollFx() {
    const head = document.querySelector('.site-head');
    const rail = document.getElementById('railFill');
    const timeline = document.getElementById('timeline');
    const para = [...document.querySelectorAll('.parallax')];
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = window.innerHeight;
      head.classList.toggle('scrolled', window.scrollY > 40);
      // Catch anything a fast scroll or an anchor jump skipped past.
      document.querySelectorAll('.reveal:not(.in), .pair:not(.in)').forEach((el) => {
        if (el.offsetParent !== null && el.getBoundingClientRect().top < vh * 0.9) {
          el.classList.add('in');
          el.querySelectorAll('.teletype').forEach((t) => t.classList.add('typed'));
          el.querySelectorAll('.glitch').forEach((g) => g.classList.add('glitching'));
          const map = el.querySelector('.rc-map');
          if (map && el.classList.contains('pair')) map.classList.add('drop');
        }
      });
      const r = timeline.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.6 - r.top) / r.height));
      rail.style.height = `${(p * 100).toFixed(2)}%`;
      if (!reduceMotion) {
        para.forEach((el) => {
          const b = el.getBoundingClientRect();
          const d = b.top + b.height / 2 - vh / 2;
          el.style.transform = `translate3d(0, ${(d * Number(el.dataset.speed || 0.05)).toFixed(1)}px, 0)`;
        });
      }
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  // =========================================================
  // REALISM: map layer viewer
  // =========================================================
  const LAYERS = [
    { id: 'relations', label: '🤝 Relations', cap: 'Relations: friends and enemies at a glance, in a colourblind-safe palette.' },
    { id: 'regimes', label: '🏛 Regimes', cap: 'Regimes: democracies, autocracies, theocracies and juntas, each with its own way to fall.' },
    { id: 'military', label: '🛡 Military', cap: 'Military: estimated strength, as your intelligence services see it.' },
    { id: 'economic', label: '💰 Economic', cap: 'Economic: GDP estimates, with war damage and sanctions priced in.' },
    { id: 'stability', label: '⚖ Stability', cap: 'Stability: where the streets could boil next.' },
    { id: 'intel', label: '🕵 Intel', cap: 'Intel: how good your picture of each country really is.' },
    { id: 'nuclear', label: '☢ Nuclear', cap: 'Nuclear: programmes as estimates, never certainties.' },
  ];
  function setupLayers() {
    const viewer = document.getElementById('layerViewer');
    const tabs = viewer.querySelector('.layer-tabs');
    const stage = viewer.querySelector('.layer-stage');
    const cap = document.getElementById('layerCaption');
    tabs.innerHTML = LAYERS.map((l, i) => `<button role="tab" id="tab-${l.id}" aria-controls="layer-stage" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${l.label}</button>`).join('');
    stage.id = 'layer-stage';
    stage.setAttribute('role', 'tabpanel');
    stage.innerHTML = LAYERS.map((l, i) => `<img src="assets/img/layer-${l.id}.jpg" srcset="assets/img/layer-${l.id}-800.jpg 800w, assets/img/layer-${l.id}.jpg 1600w" sizes="(min-width: 1000px) 58vw, 100vw" alt="World map, ${l.id} layer: ${esc(l.cap)}" loading="lazy" decoding="async" class="${i === 0 ? 'on' : ''}" />`).join('');
    const btns = [...tabs.children];
    const imgs = [...stage.children];
    let cur = 0;
    let auto = !reduceMotion;
    let timer = null;
    const select = (i, focus) => {
      cur = (i + LAYERS.length) % LAYERS.length;
      btns.forEach((b, j) => { b.setAttribute('aria-selected', j === cur); b.tabIndex = j === cur ? 0 : -1; });
      imgs.forEach((im, j) => im.classList.toggle('on', j === cur));
      stage.setAttribute('aria-labelledby', btns[cur].id);
      cap.textContent = LAYERS[cur].cap;
      if (focus) btns[cur].focus();
      const b = btns[cur];
      if (b.offsetLeft < tabs.scrollLeft || b.offsetLeft + b.offsetWidth > tabs.scrollLeft + tabs.clientWidth) {
        tabs.scrollTo({ left: b.offsetLeft - 8, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    };
    btns.forEach((b, i) => b.addEventListener('click', () => { auto = false; select(i); }));
    tabs.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { auto = false; select(cur + 1, true); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { auto = false; select(cur - 1, true); e.preventDefault(); }
    });
    select(0);
    new IntersectionObserver(([en]) => {
      clearInterval(timer);
      if (en.isIntersecting && auto) timer = setInterval(() => (auto ? select(cur + 1) : clearInterval(timer)), 2600);
    }, { threshold: 0.4 }).observe(stage);
  }

  // =========================================================
  // GALLERY + lightbox (prev/next buttons and arrow keys)
  // =========================================================
  const GALLERY = [
    { src: 'assets/img/gal-war-map.jpg', cap: 'Wars pulse on the map: front lines, alliances and rivals, as your intelligence services see them.', alt: 'Game map of the Middle East and Asia with pulsing red war borders and dashed war lines.', wide: true },
    { src: 'assets/img/gal-briefing.jpg', cap: 'How you came to power, and the one thing you must achieve.', alt: 'Briefing overlay for Taiwan: the leader, a short backstory and the mission, Eleven days of gas.' },
    { src: 'assets/img/gal-chronicle.jpg', cap: 'The World Chronicle leads with your decision, then shows what moved and why.', alt: 'The World Chronicle, a newspaper front page with the month’s headlines and your approval and stability changes.' },
    { src: 'assets/img/gal-crisis.jpg', cap: 'Arrows show the direction of consequences, never the exact numbers.', alt: 'Crisis card The First Shot with three options: respond in kind, hold fire and release the video, or pull the escorts back.' },
    { src: 'assets/img/gal-end.jpg', cap: 'Your verdict: a grade, stars, the leader you turned out to be, and what really happened.', alt: 'End screen for a Taiwan Flashpoint: mission complete, grade A, three stars, every objective met, and the debrief.' },
    { src: 'assets/img/gal-share.jpg', cap: 'Every session ends with a card to share.', alt: 'Share card: Taiwan, mission complete, grade A, three stars and a month-by-month emoji strip.' },
  ];
  function setupGallery() {
    const grid = document.getElementById('galGrid');
    grid.innerHTML = GALLERY.map((g, i) => `
      <figure class="gal-item reveal ${g.wide ? 'wide' : ''}">
        <button type="button" data-i="${i}" aria-label="Enlarge: ${esc(g.alt)}"><img src="${g.src.replace('.jpg', '-800.jpg')}" srcset="${g.src.replace('.jpg', '-800.jpg')} 800w, ${g.src} 1600w" sizes="(min-width: 1000px) ${g.wide ? '66vw' : '33vw'}, (min-width: 640px) 50vw, 100vw" alt="${esc(g.alt)}" loading="lazy" decoding="async" width="1600" height="900" /></button>
        <figcaption>${esc(g.cap)}</figcaption>
      </figure>`).join('');
    grid.querySelectorAll('.reveal').forEach((el) => revealIO.observe(el));
    const lb = document.getElementById('lightbox');
    const lbImg = lb.querySelector('img');
    const lbCap = lb.querySelector('.lb-cap');
    let cur = 0;
    const open = (i) => {
      cur = (i + GALLERY.length) % GALLERY.length;
      const g = GALLERY[cur];
      lbImg.src = g.src;
      lbImg.alt = g.alt;
      lbCap.textContent = `${cur + 1} / ${GALLERY.length} · ${g.cap}`;
    };
    grid.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-i]');
      if (!b) return;
      open(Number(b.dataset.i));
      if (lb.showModal) lb.showModal(); else window.open(GALLERY[cur].src, '_blank');
    });
    lb.querySelector('.lb-prev').addEventListener('click', () => open(cur - 1));
    lb.querySelector('.lb-next').addEventListener('click', () => open(cur + 1));
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { open(cur - 1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { open(cur + 1); e.preventDefault(); }
    });
    lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
  }

  // =========================================================
  // Boot
  // =========================================================
  let ENTRIES = [];
  setupTeletype();
  document.querySelectorAll('.reveal').forEach((el) => revealIO.observe(el));
  document.querySelectorAll('.lazy-video').forEach(observeVideo);
  setupLayers();
  setupGallery();
  requestAnimationFrame(() => document.getElementById('hero-title').classList.add('glitching'));

  loadParallels().then((data) => {
    ENTRIES = (data.entries || []).slice().sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    buildTimeline(ENTRIES);
    buildWall(ENTRIES);
    setupScrollFx();
    if (reduceMotion) {
      document.querySelectorAll('.js-watch').forEach((b) => { b.hidden = true; });
      endIntro();
      setupStepper();
    } else {
      runIntro();
    }
  });
})();
