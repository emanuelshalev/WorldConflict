/* World Conflict landing page. Plain JS, no dependencies.
 *
 * Content lives in two places:
 *  - content/parallels.json  (real events, written by the publishing side; authoritative order)
 *  - MEDIA below             (which game footage and caption goes with each event)
 * To add or swap a parallel, edit the JSON and add a MEDIA entry with the same key
 * (the entry's flashpointId, or "europe-unrest" style keys for entries without one).
 */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);

  // ---------- Game footage and captions per parallel ----------
  // short: the one-line version of realEvent used on the small wall screens (must stay within realEvent).
  // video: base path without extension (.webm + .mp4 are tried); poster/still: image path.
  const MEDIA = {
    'hormuz-convoy': {
      short: 'US–Israeli strikes kill Iran’s Supreme Leader. An undeclared war follows.',
      placeShort: 'Tehran',
      game: 'Hormuz Convoy', mode: 'Flashpoint', month: 'Month 1 · Nov 2026',
      video: 'assets/video/wall-hormuz', poster: 'assets/img/wall-hormuz.jpg',
      caption: 'A burning tanker, a midterm clock, and uranium no inspector has seen.',
      fiction: 'The tanker strike and the Isfahan satellite images are scenario events.',
    },
    'ceasefire-or-collapse': {
      short: 'The front barely moves. A local ceasefire around Oleshky, but no peace.',
      placeShort: 'Kherson front',
      game: 'Ceasefire or Collapse', mode: 'Flashpoint', month: 'Month 1 · Nov 2026',
      video: 'assets/video/wall-ukraine', poster: 'assets/img/wall-ukraine.jpg',
      caption: 'Washington arrives with a map. Winter arrives with the drones.',
    },
    'europe-unrest': {
      short: 'Around 320,000 march in France. Unions call a general strike for 5 November.',
      placeShort: 'Paris',
      game: 'General strike', mode: 'One Term · France', month: 'One Term',
      video: 'assets/video/wall-france', poster: 'assets/img/wall-france.jpg',
      caption: '“General strike paralyses France” lands on your desk: meet their demands, break the strike, or mediate, while the election clock runs.',
    },
    quarantine: {
      short: 'PLA drills rehearse sealing off Keelung and Kaohsiung.',
      placeShort: 'Taiwan Strait',
      game: 'Quarantine', mode: 'Flashpoint', month: 'Month 1 · Dec 2026',
      video: 'assets/video/wall-taiwan', poster: 'assets/img/wall-taiwan.jpg',
      caption: 'Eleven days of gas, and a coast guard that “inspects” every tanker.',
      fiction: 'The quarantine, the boardings and the warning shots are scenario fiction.',
    },
    'caracas-after-maduro': {
      short: 'A US raid captures Nicolás Maduro. He is flown to New York.',
      placeShort: 'Caracas',
      game: 'Caracas After Maduro', mode: 'Flashpoint', month: 'Month 1 · Nov 2026',
      video: null, poster: 'assets/img/wall-caracas.jpg',
      caption: 'Survive a protectorate, or turn a raid into a transition.',
    },
    'bab-al-mandab-burning': {
      short: 'Houthi forces seize Mokha, 80 km north of Bab al-Mandab.',
      placeShort: 'Mokha',
      game: 'Bab al-Mandab Burning', mode: 'Flashpoint', month: 'Month 1 · Nov 2026',
      video: 'assets/video/wall-bab', poster: 'assets/img/wall-bab.jpg',
      caption: 'Two chokepoints, one war, and the Gulf’s last sea exit.',
    },
    'scarborough-line': {
      short: 'Water cannon at Scarborough Shoal, two days running.',
      placeShort: 'Scarborough Shoal',
      game: 'Scarborough Line', mode: 'Flashpoint', month: 'Month 1 · Nov 2026',
      video: null, poster: 'assets/img/wall-scarborough.jpg',
      caption: 'One ramming too far, and a treaty that has to mean something.',
      fiction: 'The sailor’s death in the scenario is fiction: the real incidents stopped short of lethal force.',
    },
    'fire-on-the-nile': {
      short: 'After an 18-month siege, the RSF takes El Fasher.',
      placeShort: 'El Fasher',
      game: 'Fire on the Nile', mode: 'Flashpoint', month: 'Month 1 · Nov 2026',
      video: null, poster: 'assets/img/wall-nile.jpg',
      caption: 'Hold El Obeid, keep Cairo with you, and keep Sudan in one piece.',
    },
    'water-war': {
      short: 'Four days of drone and missile strikes between India and Pakistan, then a ceasefire.',
      placeShort: 'Kashmir',
      game: 'Water War', mode: 'Flashpoint', month: 'Month 1 · Nov 2026',
      video: 'assets/video/wall-water', poster: 'assets/img/wall-water.jpg',
      caption: 'India holds back the Chenab. Pakistan has said that is an act of war.',
      fiction: 'The scenario’s opening attack on pilgrims near Jammu is fictional.',
    },
  };

  // Locator maps (assets/loc/*.svg, drawn from Natural Earth). Pins are % of the map box.
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

  // ---------- Load parallels ----------
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
  function locatorHTML(key, cls = '') {
    const loc = LOC[key];
    if (!loc) return '';
    const pins = loc.pins.map((p, i) => `<span class="pin" style="left:${p[0]}%;top:${p[1]}%;--pi:${i}"></span>`).join('');
    return `<div class="rc-map ${cls}" style="--r:${loc.r}"><img src="assets/loc/${key}.svg" alt="" loading="lazy" decoding="async" />${pins}</div>`;
  }

  function videoHTML(m, label) {
    if (!m.video) return `<img src="${m.poster}" alt="${esc(label)}" loading="lazy" decoding="async" />`;
    return `<video muted loop playsinline preload="none" poster="${m.poster}" aria-label="${esc(label)}" data-base="${m.video}"></video>`;
  }

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
  function playVideo(v) {
    if (!v || reduceMotion) return;
    ensureSources(v);
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  }
  const pauseVideo = (v) => { if (v && !v.paused) v.pause(); };

  // =========================================================
  // HERO: the newsroom wall
  // =========================================================
  const hero = document.getElementById('hero');
  const wall = document.getElementById('wall');
  const camLabel = document.getElementById('camLabel');
  let tiles = []; // {el, kind, key, entry, video}
  let pairsOnWall = []; // [{real, game, entry}]
  let token = null;
  let geom = null;

  function buildWall(entries) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cols = vw >= 900 ? 4 : 2;
    const gap = 10;
    const tw = Math.round((vw * 1.12) / cols);
    const th = Math.round(tw * (cols === 2 ? 0.72 : 9 / 16));
    const rows = Math.max(3, Math.ceil((vh * 1.1) / (th + gap)));
    const slots = cols * rows;
    const usable = entries.filter((e) => MEDIA[keyOf(e)]);
    wall.style.setProperty('--cols', cols);
    wall.style.setProperty('--tw', `${tw}px`);
    wall.style.setProperty('--th', `${th}px`);
    wall.innerHTML = '';
    tiles = [];
    pairsOnWall = [];
    const perRow = cols / 2;
    let n = 0;
    for (let r = 0; r < rows; r++) {
      const rowPairs = [];
      for (let c = 0; c < perRow; c++) rowPairs.push(usable[n++ % usable.length]);
      rowPairs.forEach((entry, c) => {
        const flip = (r + c) % 2 === 1; // alternate real|game and game|real for a mixed wall
        const real = makeTile('real', entry);
        const game = makeTile('game', entry);
        if (flip) { wall.append(game.el, real.el); } else { wall.append(real.el, game.el); }
        tiles.push(real, game);
        if (pairsOnWall.length < usable.length && !pairsOnWall.some((p) => p.entry === entry)) {
          pairsOnWall.push({ real, game, entry });
        }
      });
    }
    // keep the camera visiting pairs in JSON order
    pairsOnWall.sort((a, b) => usable.indexOf(a.entry) - usable.indexOf(b.entry));
    const W = cols * tw + (cols - 1) * gap + 2 * gap;
    const H = rows * th + (rows - 1) * gap + 2 * gap;
    geom = { vw, vh, W, H, tw, th, cols };
    setWallTransform(baseTransform(1.04), false);
  }

  function makeTile(kind, entry) {
    const key = keyOf(entry);
    const m = MEDIA[key];
    const el = document.createElement('div');
    el.className = `tile ${kind}`;
    if (kind === 'real') {
      el.innerHTML = `
        <div class="real-card">
          <div class="rc-top"><span>${esc(m.placeShort)}</span></div>
          <div class="rc-body">
            <div>
              <div class="rc-date">${fmtDate(entry.date)}</div>
              <div class="rc-head">${esc(m.short)}</div>
              <div class="rc-place">${esc(entry.place)}</div>
            </div>
            ${locatorHTML(key, 'fit')}
          </div>
          <div class="ticker"><span>${esc(fmtDate(entry.date))} · ${esc(entry.place)} · ${esc(entry.realEvent)}</span></div>
        </div>
        <span class="tag">Real event</span>`;
    } else {
      el.innerHTML = `${videoHTML(m, `Game footage: ${m.game}`)}<span class="tag">In game · ${esc(m.game)}</span>`;
    }
    return { el, kind, key, entry, m, video: el.querySelector('video') };
  }

  function baseTransform(scale = 1) {
    const { vw, vh, W, H } = geom;
    return { x: (vw - W * scale) / 2, y: (vh - H * scale) / 2, s: scale };
  }
  function tileTransform(tile) {
    const { vw, vh, tw, th } = geom;
    const x = tile.el.offsetLeft + tw / 2;
    const y = tile.el.offsetTop + th / 2;
    const s = Math.min((vw * 0.9) / tw, (vh * 0.74) / th);
    return { x: vw / 2 - s * x, y: vh / 2 - s * y - Math.min(30, vh * 0.03), s };
  }
  function setWallTransform(t, animate = true) {
    wall.style.transition = animate ? '' : 'none';
    wall.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.s})`;
    if (!animate) { void wall.offsetWidth; wall.style.transition = ''; }
  }

  function showLabel(tile) {
    if (!tile) { camLabel.classList.remove('on'); return; }
    const e = tile.entry;
    const m = tile.m;
    camLabel.className = `cam-label on ${tile.kind}`;
    camLabel.querySelector('.cam-kind').textContent = tile.kind === 'real' ? `Real · ${fmtDate(e.date)}` : `In game · ${m.month}`;
    camLabel.querySelector('.cam-text').textContent = tile.kind === 'real' ? e.place : `${m.mode === 'Flashpoint' ? 'Flashpoint · ' : ''}${m.mode === 'Flashpoint' ? m.game : m.mode}`;
  }

  function ambient(on) {
    // In the wall view keep a few on-screen clips playing; everything else shows its poster.
    const max = window.innerWidth >= 900 && !saveData ? 4 : 1;
    let playing = 0;
    tiles.forEach((t) => {
      if (!t.video) return;
      if (on && playing < max && isOnScreen(t)) { playVideo(t.video); playing++; } else pauseVideo(t.video);
    });
  }
  function isOnScreen(t) {
    const r = t.el.getBoundingClientRect();
    return r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight;
  }

  function focusTile(tile) {
    tiles.forEach((t) => {
      t.el.classList.toggle('focus', t === tile);
      if (t.video && t !== tile) pauseVideo(t.video);
    });
    if (tile.video) { tile.video.currentTime = 0; playVideo(tile.video); }
    if (tile.kind === 'real') {
      const card = tile.el.querySelector('.rc-map');
      if (card) { card.classList.remove('drop'); void card.offsetWidth; card.classList.add('drop'); }
    }
  }

  async function runIntro() {
    if (token) token.cancelled = true;
    token = { cancelled: false, timers: [] };
    const tk = token;
    hero.classList.remove('ended');
    wall.classList.remove('ended');
    wall.classList.add('idle');
    setWallTransform(baseTransform(1.12), false);
    const pairCount = Math.min(window.innerWidth >= 900 ? 4 : 3, pairsOnWall.length);
    try {
      await sleep(80, tk);
      setWallTransform(baseTransform(1.0));
      ambient(true);
      await sleep(2200, tk);
      for (let i = 0; i < pairCount; i++) {
        const { real, game } = pairsOnWall[i];
        for (const tile of [real, game]) {
          wall.classList.remove('idle');
          wall.classList.add('zoomed');
          setWallTransform(tileTransform(tile));
          focusTile(tile);
          await sleep(650, tk);
          showLabel(tile);
          await sleep(tile.kind === 'real' ? 2900 : 3000, tk);
          showLabel(null);
          wall.classList.remove('zoomed');
          wall.classList.add('idle');
          setWallTransform(baseTransform(1.0));
          ambient(true);
          await sleep(1500, tk);
        }
      }
      endIntro();
    } catch { /* cancelled */ }
  }

  function endIntro() {
    if (token) { token.cancelled = true; token.timers.forEach(clearTimeout); }
    showLabel(null);
    tiles.forEach((t) => t.el.classList.remove('focus'));
    wall.classList.remove('idle', 'zoomed');
    wall.classList.add('ended');
    setWallTransform(baseTransform(1.02));
    hero.classList.add('ended');
    ambient(!reduceMotion);
    const h1 = document.getElementById('hero-title');
    if (!reduceMotion) { h1.classList.remove('glitching'); void h1.offsetWidth; h1.classList.add('glitching'); }
  }

  document.getElementById('skipIntro').addEventListener('click', () => {
    endIntro();
    document.querySelector('#heroCopy .btn-primary').focus({ preventScroll: true });
  });
  document.getElementById('replayIntro').addEventListener('click', () => { window.scrollTo({ top: 0 }); runIntro(); });
  // Escape skips; so does the first Tab, so keyboard users never land on hidden controls.
  window.addEventListener('keydown', (e) => { if ((e.key === 'Escape' || e.key === 'Tab') && !hero.classList.contains('ended')) endIntro(); });

  // Stop the intro (and its videos) once the hero leaves the screen.
  new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) {
      if (!hero.classList.contains('ended')) endIntro();
      tiles.forEach((t) => pauseVideo(t.video));
    } else if (hero.classList.contains('ended')) {
      ambient(!reduceMotion);
    }
  }, { threshold: 0.05 }).observe(hero);

  let resizeT;
  let lastW = window.innerWidth;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      if (Math.abs(window.innerWidth - lastW) < 40 && hero.classList.contains('ended')) {
        // mobile URL-bar resize: just recentre
        geom.vw = window.innerWidth; geom.vh = window.innerHeight;
        setWallTransform(baseTransform(1.02), false);
        return;
      }
      lastW = window.innerWidth;
      buildWall(ENTRIES);
      endIntro();
    }, 200);
  });

  // =========================================================
  // PARALLELS timeline
  // =========================================================
  function buildTimeline(entries) {
    const list = document.getElementById('pairs');
    list.innerHTML = entries.map((e) => {
      const key = keyOf(e);
      const m = MEDIA[key];
      if (!m) return '';
      const label = `Game screen from ${m.game}: ${m.caption}`;
      return `
      <li class="pair">
        <article class="p-real paper-card" aria-label="Real event, ${esc(fmtDate(e.date))}">
          <span class="pc-label">Real</span>
          <p class="pc-date"><time datetime="${e.date}">${fmtDate(e.date)}</time></p>
          <p class="pc-place">${esc(e.place)}</p>
          <p class="pc-fact">${esc(e.realEvent)}</p>
          <div class="rc-wrap">${locatorHTML(key)}</div>
        </article>
        <article class="p-game game-card" aria-label="In the game: ${esc(m.game)}">
          <div class="gc-media">
            <span class="gc-tag">In game</span>
            ${m.video ? `<video class="lazy-video" muted loop playsinline preload="none" poster="${m.poster}" aria-label="${esc(label)}" data-base="${m.video}"></video>`
              : `<img src="${m.poster}" alt="${esc(label)}" loading="lazy" decoding="async" />`}
          </div>
          <div class="gc-body">
            <p class="gc-mode">${esc(m.mode)}</p>
            <h3>${esc(m.game)}</h3>
            <p>${esc(m.caption)}</p>
            ${m.fiction ? `<p class="fine" style="margin-top:10px">${esc(m.fiction)}</p>` : ''}
          </div>
        </article>
      </li>`;
    }).join('');
    const io = new IntersectionObserver((ens) => {
      ens.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          const map = en.target.querySelector('.rc-map');
          if (map) map.classList.add('drop');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -15% 0px' });
    list.querySelectorAll('.pair').forEach((p) => io.observe(p));
    list.querySelectorAll('.lazy-video').forEach(observeVideo);
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
      if (el.classList.contains('teletype')) el.classList.add('typed');
      el.querySelectorAll('.glitch').forEach((g) => g.classList.add('glitching'));
      revealIO.unobserve(el);
    });
  }, { rootMargin: '0px 0px -10% 0px' });

  const videoIO = new IntersectionObserver((ens) => {
    ens.forEach((en) => (en.isIntersecting ? playVideo(en.target) : pauseVideo(en.target)));
  }, { threshold: 0.35 });
  function observeVideo(v) {
    if (reduceMotion) {
      // No autoplay: let people start clips themselves.
      v.controls = true;
      v.addEventListener('play', () => ensureSources(v), { once: true });
      v.preload = 'none';
      if (v.dataset.base) ensureSources(v);
      else v.querySelectorAll('source[data-src]').forEach((s) => { s.src = s.dataset.src; });
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
        if (el.getBoundingClientRect().top < vh * 0.9) {
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
  // GALLERY + lightbox
  // =========================================================
  const GALLERY = [
    { src: 'assets/img/gal-war-map.jpg', cap: 'Wars pulse on the map: front lines, alliances and rivals, as your intelligence services see them.', alt: 'Game map of the Middle East with pulsing red war borders and dashed war lines.', wide: true },
    { src: 'assets/img/gal-briefing.jpg', cap: 'How you came to power, and the one thing you must achieve.', alt: 'Briefing overlay: the leader’s title, a short backstory and the mission for the next twelve months.' },
    { src: 'assets/img/gal-chronicle.jpg', cap: 'The World Chronicle leads with your decision, then shows what moved and why.', alt: 'The World Chronicle, a newspaper front page with the month’s headlines and your approval and stability changes.' },
    { src: 'assets/img/gal-crisis.jpg', cap: 'Arrows show the direction of consequences, never the exact numbers.', alt: 'A crisis card with three options, each showing effect arrows and the minister who backs it.' },
    { src: 'assets/img/gal-end.jpg', cap: 'Your verdict: a grade, stars, the leader you turned out to be, and what really happened.', alt: 'End screen with a letter grade, stars, a month-by-month emoji strip and the debrief.' },
    { src: 'assets/img/gal-title.jpg', cap: 'Ten minutes, an evening or a decade. Choose how long you have.', alt: 'Title screen with the three modes, the flashpoint cards and the nation picker.', wide: true },
    { src: 'assets/img/gal-share.jpg', cap: 'Every session ends with a card to share.', alt: 'Share card: the nation, grade, stars and an emoji strip of the twelve months.' },
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
    grid.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-i]');
      if (!b) return;
      const g = GALLERY[Number(b.dataset.i)];
      lbImg.src = g.src;
      lbImg.alt = g.alt;
      lbCap.textContent = g.cap;
      if (lb.showModal) lb.showModal(); else window.open(g.src, '_blank');
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
  setupScrollFx();
  setupLayers();
  setupGallery();

  loadParallels().then((data) => {
    ENTRIES = (data.entries || []).slice().sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    buildTimeline(ENTRIES);
    buildWall(ENTRIES);
    if (reduceMotion) { document.getElementById('replayIntro').hidden = true; endIntro(); } else runIntro();
    setupScrollFx();
  });
})();
