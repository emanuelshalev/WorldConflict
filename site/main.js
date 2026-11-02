/* World Conflict landing page. Plain JS, no dependencies.
 *
 * Content:
 *  - PARALLELS below: the real event (from content/parallels.json, which keeps the sources and
 *    verification notes) and the game moment that answers it, with its recorded clip.
 *  - SCENES below: the 20 broadcast scenes, recorded from the game by tools/record-clips.cjs.
 */
// ---------------------------------------------------------------------------
// SITE CONFIG: the only values to edit before and after launch.
//  playUrl     the hosted game. While null, the page shows an "In development" status line.
//  signupUrl   waitlist form POST action (Buttondown, Formspree, Tally...). While null, no form.
//  signupField name of the email field the provider expects.
//  repoUrl     optional "Follow development" / "Source on GitHub" link (hidden while null).
// ---------------------------------------------------------------------------
const SITE = {
  playUrl: null,
  signupUrl: null,
  signupField: 'email',
  repoUrl: null,
  siteUrl: 'https://emanuelshalev.github.io/WorldConflict/',
};

// Real event (as reported) and the game moment that answers it. No quotes from real people.
const PARALLELS = [
  {
    id: 'p-iran', tab: 'US–Iran war', date: '28 Feb 2026', place: 'Tehran, Iran',
    real: 'US–Israeli strikes on Iran killed Supreme Leader Ali Khamenei, opening an undeclared war that later brought a US naval blockade of Iranian ports.',
    mode: 'Flashpoint · Hormuz Convoy',
    game: 'Three days before the US midterms, a tanker burns off Fujairah. Play the US and open the strait without letting Iran test a bomb, or play Iran and decide what to do with the weapon in the tunnels.',
    fiction: 'The tanker strike and the Isfahan satellite images are scenario events.',
  },
  {
    id: 'p-ukraine', tab: 'Russia–Ukraine', date: '27 Oct 2026', place: 'Ukraine: the front line',
    real: "Nearly five years into Russia's full-scale invasion, the front barely moves. The only truce is a US-brokered local ceasefire around occupied Oleshky, while Moscow still demands all of Donetsk.",
    mode: 'Flashpoint · Ceasefire or Collapse',
    game: 'Month one: Washington floats a free economic zone in Donetsk. As Kyiv, accept in principle, demand a referendum, or reject it and strike. Russia and the US can be played too.',
  },
  {
    id: 'p-europe', tab: 'Europe in the streets', date: '31 Oct 2026', place: 'France, Italy, Germany',
    real: 'A cost-of-living revolt spreads across Europe: around 320,000 march in France by the Interior Ministry count, unions call a general strike for 5 November, Italy holds a general strike and police clash with protesters in Hamburg and Zurich.',
    mode: 'One Term · France or Germany',
    game: 'The card "General strike paralyses France" lands on your desk. Meet their demands, break the strike, or ride it out, while approval slides and the election clock runs.',
  },
  {
    id: 'p-taiwan', tab: 'Taiwan Strait', date: '29 Dec 2025', place: 'Taiwan Strait',
    real: "China's two-day Justice Mission-2025 exercise rehearsed sealing off Taiwan's main ports of Keelung and Kaohsiung, days after a record US arms package for Taipei.",
    mode: 'Flashpoint · Quarantine',
    game: 'The China Coast Guard begins "customs inspections" of Taiwan-bound shipping. Taiwan has eleven days of gas and one rule: never fire the first shot.',
    fiction: 'The quarantine, the Penghu boarding and the warning shots are scenario fiction.',
  },
  {
    id: 'p-caracas', tab: 'Caracas', date: '3 Jan 2026', place: 'Caracas, Venezuela',
    real: 'A US military raid on Caracas captured Nicolás Maduro, who was flown to New York to face federal charges. Delcy Rodríguez was sworn in as acting president days later.',
    mode: 'Flashpoint · Caracas After Maduro',
    game: 'Ten months into an improvised transition, Machado comes home. Arrest her, let her rally, or offer her a ministry, then set the election date.',
  },
  {
    id: 'p-bab', tab: 'Red Sea', date: '10 Sep 2026', place: 'Mokha, Yemen',
    real: 'Houthi forces seized the Red Sea port of Mokha, about 80 km north of the Bab al-Mandab strait, according to Yemeni government and military sources.',
    mode: 'Flashpoint · Bab al-Mandab Burning',
    game: 'As Saudi Arabia, answer the strikes, then decide what to do about the island in the strait: storm it, starve it, or settle it at the table.',
    fiction: 'Perim Island changing hands is part of the scenario, not a confirmed event.',
  },
  {
    id: 'p-scarborough', tab: 'Scarborough Shoal', date: '23 Jul 2026', place: 'Scarborough Shoal',
    real: "China's coast guard turned water cannon on Philippine government vessels at Scarborough Shoal, and again the next day, according to Manila. The real incidents stopped short of lethal force.",
    mode: 'Flashpoint · The Scarborough Line',
    game: 'Month one, a sailor dies at the shoal. Invoke the 1951 treaty, file a second arbitration, or call Beijing quietly.',
    fiction: "The sailor's death, the dredging and the runway are scenario fiction.",
  },
  {
    id: 'p-sudan', tab: 'Sudan', date: '26 Oct 2025', place: 'El Fasher, Sudan',
    real: "After an 18-month siege, the Rapid Support Forces took El Fasher, the Sudanese army's last stronghold in Darfur, amid widely reported atrocities against civilians.",
    mode: 'Flashpoint · Fire on the Nile',
    game: 'Govern from Port Sudan with El Obeid besieged and the last road cut: a relief offensive, a civilian corridor, or arming the militias.',
  },
  {
    id: 'p-kashmir', tab: 'India–Pakistan', date: '7 May 2025', place: 'Kashmir and Punjab',
    real: 'Two weeks after the Pahalgam attack, India struck targets in Pakistan. Four days of drone, missile and air-base strikes between the two nuclear-armed neighbours ended in a ceasefire on 10 May.',
    mode: 'Flashpoint · Water War',
    game: 'The Indus Waters Treaty is in abeyance and India can hold back the Chenab. Playing Pakistan, the river drops by a third: deter on two fronts without a full-scale war.',
    fiction: "The scenario's opening attack on pilgrims is fictional.",
  },
];

const SCENES = [
  ['address', 'Address the nation', 'National address'],
  ['cabinet', 'Cabinet meeting', 'Crises, coup plots'],
  ['press', 'Press briefing', 'Denounce, break a pact'],
  ['tv_interview', 'The sit-down interview', 'Scandals'],
  ['exec_order', 'Signing the order', 'Reform program'],
  ['summit', 'Photo op with a leader', 'Court a nation, trade deals'],
  ['signing', 'Treaty signing', 'Defense pacts'],
  ['parliament', 'The vote in parliament', 'Budgets, no-confidence'],
  ['election', 'Election night', 'Campaigns, the finale'],
  ['econ_tv', 'Markets on TV', 'Recessions, oil shocks'],
  ['field_visit', 'Out among the people', 'Refugees, rallies'],
  ['streets', 'The streets', 'Strikes, policing'],
  ['war_room', 'The Situation Room', 'Ultimatums, incidents'],
  ['deployment', 'Troops on the move', 'Mobilize, mass at the border'],
  ['airstrike', 'Airstrike', 'Strikes on military or nuclear sites'],
  ['nuclear', 'The program', 'Fund it, or bomb someone else’s'],
  ['covert', 'Covert operations', 'Spies, sabotage, coups'],
  ['ceasefire', 'At the table', 'Ceasefires, mediation'],
  ['un_vote', 'The vote in New York', 'Sanctions'],
  ['disaster', 'Disaster', 'Storms, attacks, pandemics'],
];

(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Config ----------
  if (SITE.playUrl) {
    document.querySelectorAll('.js-play-link').forEach((a) => {
      a.href = SITE.playUrl;
      a.hidden = false;
    });
    document.querySelectorAll('.js-status').forEach((s) => (s.hidden = true));
  }
  if (SITE.repoUrl) document.querySelectorAll('.js-repo').forEach((a) => { a.href = SITE.repoUrl; a.hidden = false; });
  if (SITE.signupUrl) {
    document.querySelectorAll('.js-signup').forEach((f) => {
      f.action = SITE.signupUrl;
      f.querySelector('input').name = SITE.signupField;
      f.hidden = false;
    });
  }

  // ---------- Header ----------
  const head = $('.site-head');
  const onScroll = () => head.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- Reality vs game ----------
  const tabs = $('#parTabs');
  const stage = $('#parStage');
  const video = $('#parVideo');
  const bar = $('#parBar');
  const SLIDE_MS = 11000;
  let current = -1;
  let timer = 0;
  let started = 0;
  let paused = false;
  let parVisible = false;

  tabs.innerHTML = PARALLELS.map(
    (p, i) => `<button class="par-tab" role="tab" id="tab-${p.id}" aria-selected="false" data-i="${i}"><small>${p.date}</small>${p.tab}</button>`,
  ).join('');

  function show(i) {
    current = (i + PARALLELS.length) % PARALLELS.length;
    const p = PARALLELS[current];
    tabs.querySelectorAll('.par-tab').forEach((t, n) => t.setAttribute('aria-selected', String(n === current)));
    $('#parDate').textContent = p.date;
    $('#parMap').src = `assets/maps/${p.id}.svg`;
    $('#parMap').alt = `Locator map: ${p.place}`;
    $('#parPlace').textContent = p.place;
    $('#parText').textContent = p.real;
    $('#parMode').textContent = p.mode;
    $('#parGameText').textContent = p.game;
    const fic = $('#parFiction');
    fic.hidden = !p.fiction;
    fic.textContent = p.fiction || '';
    video.poster = `assets/clips/${p.id}.jpg`;
    video.dataset.src = `assets/clips/${p.id}.mp4`;
    video.setAttribute('aria-label', `Game clip: ${p.mode}`);
    if (parVisible) {
      video.src = video.dataset.src;
      if (!reduceMotion) video.play().catch(() => {});
    } else video.removeAttribute('src');
    stage.classList.remove('swap');
    void stage.offsetWidth;
    stage.classList.add('swap');
    started = performance.now();
  }
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('.par-tab');
    if (b) {
      show(+b.dataset.i);
      b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  });
  stage.addEventListener('mouseenter', () => (paused = true));
  stage.addEventListener('mouseleave', () => {
    paused = false;
    started = performance.now();
  });
  const tick = (t) => {
    if (!paused && !reduceMotion && current >= 0 && parVisible) {
      const k = Math.min(1, (t - started) / SLIDE_MS);
      bar.style.width = `${k * 100}%`;
      if (k >= 1) show(current + 1);
    }
    timer = requestAnimationFrame(tick);
  };
  show(0);
  timer = requestAnimationFrame(tick);

  // ---------- Filmstrip of scenes (still images: cheap) ----------
  const film = SCENES.map(([k, title]) => `<figure><img src="assets/clips/s-${k}.jpg" alt="" loading="lazy" width="132" height="74" /><figcaption>${title}</figcaption></figure>`).join('');
  $('#filmRun').innerHTML = film + film;

  // ---------- Timeline: the step in the middle of the screen is active; only its clip plays ----------
  const steps = [...document.querySelectorAll('.tl-step')];
  const timeline = $('#timeline');
  const loadVideo = (v) => {
    const src = v.querySelector('source[data-src]');
    if (src) {
      src.src = src.dataset.src;
      src.removeAttribute('data-src');
      v.load();
    }
  };
  let activeStep = null;
  const setActive = (step) => {
    if (step === activeStep) return;
    activeStep = step;
    for (const st of steps) {
      const on = st === step;
      st.classList.toggle('active', on);
      const v = st.querySelector('video');
      if (!v) continue;
      if (on) {
        loadVideo(v);
        if (!reduceMotion) v.play().catch(() => {});
      } else v.pause();
    }
  };
  const onTimeline = () => {
    const mid = window.innerHeight * 0.55;
    let best = null;
    let bestD = Infinity;
    for (const st of steps) {
      const r = st.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestD) { bestD = d; best = st; }
    }
    const tr = timeline.getBoundingClientRect();
    const inView = tr.top < window.innerHeight && tr.bottom > 0;
    setActive(inView ? best : null);
    timeline.style.setProperty('--progress', `${Math.max(0, Math.min(tr.height - 20, mid - tr.top))}px`);
  };
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onTimeline(); ticking = false; });
  }, { passive: true });
  onTimeline();

  // ---------- Reveal on scroll ----------
  const rio = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), rio.unobserve(e.target))),
    { rootMargin: '0px 0px -10% 0px' },
  );
  document.querySelectorAll('.section > .container > :not(.tl-step), .reveal').forEach((el) => {
    el.classList.add('reveal');
    rio.observe(el);
  });
  void timer;
})();
