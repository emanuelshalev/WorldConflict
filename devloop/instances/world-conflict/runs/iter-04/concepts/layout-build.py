#!/usr/bin/env python3
"""Iteration 4 layout system mocks (D-80, RS-008) for design-layout.md.
Content and visual language from iter-03/concepts/agenda-h-build.py (round 3, D-72); the layout is new.
   python3 devloop/instances/world-conflict/runs/iter-04/concepts/layout-build.py
   node devloop/instances/world-conflict/runs/iter-04/layout-shots.mjs     (screenshots + layout audit)"""
from pathlib import Path

HERE = Path(__file__).parent

# L-10 fit script: plan sections fold in priority order (data-fold 1 first) until the plan fits; a folded
# section keeps its title, count, one-line summary and a Show button. Show opens it and folds the others.
# L-15 phone cue: counts the answers below the fold or under the bottom bar and says so in the bottom bar.
SCRIPT = r'''<script>
function fitPlan(list, keep) {
  const secs = [...list.querySelectorAll('.psec[data-fold]')].sort((a, b) => a.dataset.fold - b.dataset.fold);
  secs.forEach((s) => s.classList.remove('folded')); list.classList.remove('compact');
  const steps = [];
  for (const s of secs) { if (s.dataset.fold !== '1' && !steps.includes('compact')) steps.push('compact'); if (s !== keep) steps.push(s); }
  if (!steps.includes('compact')) steps.push('compact');
  for (const st of steps) {
    if (list.scrollHeight <= list.clientHeight + 1) break;
    if (st === 'compact') list.classList.add('compact'); else st.classList.add('folded');
  }
  if (keep && list.scrollHeight > list.clientHeight + 1) keep.classList.add('folded');
  secs.forEach((s) => { const b = s.querySelector('.tog'); if (b) b.textContent = s.classList.contains('folded') ? 'Show' : ''; b && (b.hidden = !s.classList.contains('folded')); });
}
function fitAll() { document.querySelectorAll('.app .plan .list, .app .mapplan .list').forEach((l) => fitPlan(l)); belowCue(); }
document.addEventListener('click', (e) => {
  const h = e.target.closest('.psec > .h'); if (!h) return;
  const s = h.parentElement; if (!s.classList.contains('folded')) return;
  fitPlan(s.closest('.list'), s);
});
function belowCue() {
  const cue = document.querySelector('.ph .below'); if (!cue || !cue.offsetParent && getComputedStyle(cue).display === 'none' && !cue.hidden) return;
  const bar = document.querySelector('.ph .ph-bottom'); const limit = bar ? bar.getBoundingClientRect().top : innerHeight;
  const below = [...document.querySelectorAll('.ph [data-answer]')].filter((el) => el.getBoundingClientRect().bottom > limit + 1);
  if (!below.length) { cue.hidden = true; return; }
  cue.hidden = false;
  const skip = below.some((el) => el.dataset.answer === 'skip'); const n = below.filter((el) => el.dataset.answer !== 'skip').length;
  const parts = []; if (n) parts.push(n + (n === 1 ? ' more answer' : ' more answers')); if (skip) parts.push(n ? 'Skip' : 'Skip card');
  cue.textContent = parts.join(' and ') + ' below ↓';
  cue.onclick = () => below[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
}
addEventListener('resize', fitAll); addEventListener('scroll', belowCue, { passive: true });
fitAll(); setTimeout(fitAll, 50);
</script>'''


def page(title, lap, ph, note):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="stylesheet" href="layout.css">
</head>
<body>
<!-- Layout mock (D-80, RS-008). {note} -->
<div class="app">
{lap}
</div>
<div class="ph">
{ph}
</div>
{SCRIPT}
</body>
</html>
'''


def state(month=4, mode='Desk', show=True):
    """L-5: the state band. Line 1: who, the month, the mission, the switches. Line 2: this month's budget and your country."""
    d, m = ('on', '') if mode == 'Desk' else ('', 'on')
    track = 'month 1 of 12' if month == 1 else '2 of 3 goals on track'
    budget = ('<span class="s pc">Political capital<span class="wideonly"> (what orders cost)</span> <b class="num">◆ 3 of 6</b></span><button class="btn small">Explain</button>'
              + '<span class="s">Orders <b class="num">0 of 6</b></span>'
              + ('' if month == 1 else '<span class="s">Meetings<span class="tabhide"> you take</span> <b class="num">0 of 3</b></span><span class="s">Defense<span class="wideonly"> budget</span> <b class="num">12% used</b></span>'))
    country = f'<span class="s">Approval <b class="num">{"52" if month == 1 else "48"}%</b></span><span class="s">Stability <b class="num">{"74" if month == 1 else "71"}</b></span><span class="s"><span class="tabhide">World t</span><span class="tabonly">T</span>ension <b class="num">{"58" if month == 1 else "62"}</b></span>'
    sh = ''
    return f'''<header class="state" data-region="state" aria-label="Your state">
  <div class="l1"><span class="who">🇺🇸 <span class="wideonly2">President of the </span><span class="tabhide">United States</span></span><span class="month">Month {month} of 12<span class="tabhide"> · {"January" if month == 1 else "April"} 2027</span></span>
    <button class="btn goalbtn"><span>Mission<span class="tabhide">: <b>Keep the Strait open without a war</b></span> · <span class="muted">{track}</span></span><span class="chev">Open ›</span></button></div>
  <div class="right">{sh}<div class="seg" role="tablist" aria-label="View"><button class="{d}" role="tab">Desk</button><button class="{m}" role="tab">Map</button></div></div>
  <div class="l2"><div class="grp"><span class="lbl wideonly2">This month</span>{budget}</div><span class="divv"></span><div class="grp"><span class="lbl wideonly2">Your country</span>{country}</div></div>
</header>'''


def bar(now, total, title, done, next_title, back=True, show=True, sub=None):
    sh = '<span class="showl"><span class="s">Show:</span><span class="seg" role="tablist" aria-label="Show one thing at a time or everything"><button class="on" role="tab">One at a time</button><button role="tab">Everything</button></span></span>' if show else ''
    bb = '<button class="btn">‹ Back</button>' if back else ''
    return f'''<nav class="bar" data-region="bar" aria-label="This month">
  <span class="t"><b>{now} of {total}: {title}</b>{sub or f"{done} done, {total - done} to go"}</span>
  {sh}{bb}<button class="btn"><span>Next<span class="nexttitle">: {next_title}</span></span> <span class="chev">›</span></button><button class="btn seeall">See all {total} <span class="chev">▾</span></button><button class="btn">Check and execute <span class="chev">›</span></button>
</nav>'''


def opt(name, fx, rec=None, cls='', more=''):
    r = f'<span class="rec {cls}">★ Recommended by {rec}</span>' if rec else ''
    m = f'<span class="more">{more}</span>' if more else ''
    return f'<button class="opt" data-answer="opt"><span class="body">{r}<span class="name">{name}</span><span class="fx">{fx}</span>{m}</span><span class="face">Choose</span></button>'


def skipcard(label, fx, more=''):
    m = f'<span class="more">{more}</span>' if more else ''
    return f'<button class="opt skipopt" data-answer="skip"><span class="body"><span class="or">Or, if you do not want to decide:</span><span class="name">{label}</span><span class="fx">{fx}</span>{m}</span><span class="face">Skip</span></button>'


def hero(kick, title, quote, crisis=False):
    art = ('<path d="M0 140 Q200 128 400 140 T800 140 V200 H0Z" fill="#10233a"/><path d="M430 70 q30 -30 60 0 q-10 40 -30 60 q-25 -20 -30 -60z" fill="#2a3d55"/><g fill="#8fa0b8"><path d="M120 128 h70 l-10 10 h-52z"/><path d="M260 112 h60 l-8 9 h-44z"/><path d="M600 124 h66 l-9 10 h-50z"/></g>'
           if crisis else
           '<path d="M0 150 Q200 138 400 150 T800 150 V200 H0Z" fill="#10233a"/><rect x="470" y="30" width="300" height="140" rx="12" fill="#18304f"/><path d="M560 170 q0 -60 60 -60 q60 0 60 60z" fill="#0f1d31"/><circle cx="620" cy="82" r="30" fill="#0f1d31"/><rect x="490" y="44" width="40" height="26" rx="3" fill="#c8102e" opacity=".8"/>')
    return f'''<div class="hero{' crisis' if crisis else ''}"><svg viewBox="0 0 800 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">{art}</svg><div class="shade"></div><div class="txt"><div class="kick">{kick}</div><h1>{title}</h1><p>{quote}</p></div></div>'''


STRAIT = '''<svg viewBox="0 0 600 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <path d="M0 0 H360 C380 60 340 120 300 170 C260 220 230 300 180 360 H0Z" fill="#2c3b2f" stroke="#41543f"/>
  <path d="M430 170 C455 190 462 240 440 290 C425 270 418 210 430 170Z" fill="#3d5a7a" stroke="#6b93bd" stroke-width="2"/>
  <path d="M520 0 C560 40 580 90 600 110 V0Z" fill="#33465a" stroke="#4d6680"/>
  <path d="M380 150 C400 175 405 210 398 250" stroke="#e5383b" stroke-width="3" stroke-dasharray="6 6" fill="none"/>
  <g fill="#8fa0b8"><path d="M372 190 h22 l-4 5 h-15z"/><path d="M360 230 h22 l-4 5 h-15z"/><path d="M455 140 h22 l-4 5 h-15z"/></g>
</svg>'''


def advice(rows):
    r = ''.join(f'<div class="r"><span><b>{who}</b>: "{say}"</span></div>' for who, say in rows)
    return f'<div class="facts advice"><h3>What your advisers say</h3>{r}</div>'


def story(rows):
    r = ''.join(f'<li><span class="when">{w}</span><span>{t}</span></li>' for w, t in rows)
    return f'<div class="story"><h3>How it got here</h3><ol>{r}</ol></div>'


def facts(title, rows, cls=''):
    r = ''.join(f'<div class="r"><span>{a}</span><span>{b}</span></div>' for a, b in rows)
    return f'<div class="facts {cls}"><h3>{title}</h3>{r}</div>'


def plan(decided, recs, rec_sum, skipped, exec_lines, month):
    dec = ''.join(f'<div class="row"><span class="t">You chose: {a}<small class="opt2">{b}</small></span><button class="btn small">Change</button></div>' for a, b in decided)
    rc = ''.join(f'<div class="row"><span class="t">{a}<small class="opt2">{b}</small></span><button class="btn small">Open ›</button></div>' for a, b in recs)
    sk = ''.join(f'<div class="row"><span class="t">Skipped: {a}<small class="opt2">{b}</small></span><button class="btn small">Undo</button></div>' for a, b in skipped)
    secs = ''
    if decided:
        secs += f'<section class="psec" data-fold="2"><button class="h"><span>Decided ({len(decided)})</span><span class="tog" hidden></span></button><p class="sum">{", ".join(a for a, _ in decided)}</p><div class="rows">{dec}</div></section>'
    if recs:
        secs += f'''<section class="psec" data-fold="3" data-rec-group><button class="h"><span>Recommended ({len(recs)}), still to do</span><span class="tog" hidden></span></button><p class="sum">{rec_sum}</p><div class="rows">{rc}</div>
  <div class="accept"><button class="btn wide">Accept all recommended ({len(recs)})</button><span class="def">Chooses the recommended answer for every thing still to do.</span></div></section>'''
    if skipped:
        secs += f'<section class="psec" data-fold="1"><button class="h"><span>Skipped ({len(skipped)})</span><span class="tog" hidden></span></button><p class="sum">{", ".join(a for a, _ in skipped)}</p><div class="rows">{sk}</div></section>'
    if not decided and not skipped:
        secs = '<p class="muted" style="font-size:.9375rem;margin:.25rem 0 .5rem">Nothing decided yet.</p>' + secs
    lines = ''.join(f'<li>{x}</li>' for x in exec_lines)
    return f'''<div class="list"><h2>What will happen</h2>{secs}</div>
  <div class="execb"><p class="h">If you execute now:</p><ul>{lines}</ul><button class="btn primary exec">Execute month {month} <span class="sub">ends the month</span></button></div>'''


def deskstrip(n_recs, conseq, month):
    """T (701 to 1279): the plan region becomes a bar under the thing, same as the Map strip (L-11)."""
    return f'''<div class="strip deskstrip" data-region="plan" aria-label="What will happen">
  <button class="btn">☰ Review {n_recs} recommended</button>
  <span class="grow"></span>
  <div class="endgrp"><span class="conseq"><b>If you execute now:</b> {conseq}</span><button class="btn primary execmap">Execute month {month} <span class="sub">ends the month</span></button></div>
</div>'''


def lrows(rows):
    return ''.join(f'<button class="lrow{" now" if st.startswith("You are here") else ""}"><span class="t"><b>{t}</b><span class="lst">{st}</span></span><span class="face">Open</span></button>' for t, st in rows)


def phone(l1, nav_b, nav_t, body, bottom):
    return f'''<header class="ph-state" data-region="state">
  <div class="l1">{l1}<span class="grow"></span><button class="btn small">State ▾</button></div>
  <div class="l2"><button class="btn small">‹ Back</button><span class="t"><b>{nav_b}</b>{nav_t}</span><button class="btn small">See all</button></div>
</header>
<main class="ph-body" data-region="item">{body}</main>
<div class="ph-bottom"><button class="btn below" hidden>More below</button>{bottom}</div>'''


def write(name, html):
    (HERE / name).write_text(html)
    print(name)


# ======================= month 4: Xi Jinping calls (thing 2 of 6) =======================
XI_OPTS = [
    opt('Hold firm: the patrol stays', '<span class="good">Keeps the Strait open (your goal).</span> China relations -6. Tension rises.', more='Free. Taiwan and Japan approve. Beijing may extend the drills next month.'),
    opt('Propose a hotline · costs ◆ 1', 'Tension falls a lot. China relations +5. No goal is hurt.', rec='your Secretary of State: "It cools things down and costs Japan nothing."', more='Costs ◆ 1 of your 3. The patrol keeps sailing; the hotline is used for the first time since 1998.'),
    opt('Offer a quiet pause', 'Tension falls. <span class="bad">Japan trusts you less (-4): hurts your goal "Japan stays on side".</span>', more='Free. The patrol waits in port for a month; Tokyo hears about it from the press.'),
    skipcard('Skip this call: your Foreign Minister answers', 'She says "We note your concern." Free, but China relations -3: Xi notices you did not call back.', more='You can still open the call again before you execute.'),
]
GOALS_XI = facts('Your goals in this call', [('The Strait stays open', 'Hold firm helps'), ('No war with China', 'Hotline helps, Hold firm risks'), ('Japan stays on your side', 'Quiet pause hurts')], 'goals')
STORY_XI = story([('Month 1', 'PLA warships ring Taiwan. You sent a joint patrol with Japan.'), ('Month 2', 'China puts sanctions on three Japanese shipyards.'), ('Month 3', 'Tokyo asks for a second patrol; you agreed.'), ('Month 4', 'PLA drills close the north channel. Xi Jinping calls you.')])
STORY_M1 = story([('2026', 'Taiwan elects a president Beijing calls a separatist.'), ('December', 'PLA exercises grow from 10 to 30 ships.'), ('Month 1', 'The north channel closes for "drills". Taipei calls you.')])
ADV_XI = advice([('Secretary of State', 'A hotline costs us one point of capital and buys a month of calm. Japan loses nothing.'), ('Defense Secretary', 'Holding firm is what Taipei and Tokyo expect. Beijing tests whoever blinks.'), ('Chief of Staff', 'Whatever you say, say it yourself: skipping Xi reads as weakness at home.')])
ADV_M1 = advice([('Defense Secretary', 'A joint patrol shows Beijing we will not back off, with Japan beside us.'), ('Secretary of State', 'A quiet message keeps the door open, but Taipei will feel it.'), ('Treasury Secretary', 'Sanctions now cost us more than they cost the PLA.')])
MISSION_PANEL = facts('Your mission: month 4 of 12', [('The Strait stays open', 'On track'), ('No war with China', 'On track'), ('Japan stays on your side', 'At risk')], 'mission')
M4_THINGS = [
    ('PLA drills close the north channel', 'Decided: joint patrol with Japan'),
    ('Xi Jinping calls', 'You are here · to do'),
    ('PM Takaichi visits', 'To do · recommended: reaffirm the alliance'),
    ('Small meetings (2)', 'To do · recommended: your ministers take both'),
    ('Recommended orders (2)', 'To do · Court India, Intelligence on China'),
    ('Your own orders', 'Optional · 3 suggestions, all orders'),
]
M4_RECS = [('Xi call: propose a hotline · ◆ 1', 'China +5'), ('Takaichi visit: reaffirm the alliance', 'Japan on side +3'),
           ('Small meetings: your ministers take both', 'Free, no effect'), ('Order: Court India · ◆ 1', 'India +6, approval +2'), ('Order: Intelligence on China · ◆ 1', 'Better estimates of China')]
M4_EXEC = ['Your answer to the PLA drills happens.', 'Your ministers take 4 meetings for you. <span class="bad">China -3, Japan -2.</span>', 'The 2 recommended orders do not run (◆ 2 stay).']
M4_PLAN = plan([('Joint patrol with Japan', 'PLA drills close the north channel')], M4_RECS, 'Xi call, Takaichi visit, small meetings, 2 orders (◆ 3)', [], M4_EXEC, 4)

thing_xi = f'''<div class="thing">
  <div class="sit">{hero('A call on the secure line · 🇨🇳 China', 'Xi Jinping calls', '"Your ships are sailing into a storm. Pull the patrol back and we can talk about the exercise."')}{GOALS_XI}{STORY_XI}</div>
  <div class="ans"><p class="ask">What do you say? Choose one of 3 answers, or skip (last card).</p><div class="opts">{''.join(XI_OPTS)}</div>{ADV_XI}</div>
  <div class="ctx"><div class="ctxmap">{STRAIT}<span class="cap">Taiwan Strait · PLA drills close the north channel</span></div>{GOALS_XI.replace('facts goals', 'facts')}
    <div class="bg"><h3 style="font-size:.9375rem;color:var(--text-2)">Background</h3><p>The patrol you sent with Japan last month sails through the north channel on Thursday. Beijing calls it a provocation; Tokyo and Taipei watch whether you hold the line or trade it for calm. A hotline exists between the two navies since 1998 but has not been used in this crisis.</p><button class="btn small">Read in the codex ›</button></div></div>
</div>'''

lap = state(4) + bar(2, 6, 'Xi Jinping calls', 1, 'Takaichi visits') + f'''<main class="main" data-region="main">
  <aside class="col-list" data-region="list" aria-label="This month: all 6 things"><h2>This month: 6 things</h2><p class="hint">1 done, 5 to go. Open any of them.</p>{lrows(M4_THINGS)}<div class="grow"></div>{MISSION_PANEL}</aside>
  <section class="item" data-region="item" aria-label="2 of 6: Xi Jinping calls">{thing_xi}</section>
  <aside class="plan" data-region="plan" aria-label="What will happen">{M4_PLAN}</aside>
</main>''' + deskstrip(5, '1 decision, 4 meetings by ministers (China -3, Japan -2), 2 orders do not run.', 4)
ph = phone('<span>Month <b>4</b></span><span class="pc">◆ <b>3 of 6</b></span><span>Orders <b>0 of 6</b></span>', '2 of 6 · Xi Jinping calls', '1 done, 5 to go',
           '<div class="ph-kick">A call on the secure line · 🇨🇳 China</div><h1>Xi Jinping calls</h1><p class="ph-quote">"Your ships are sailing into a storm. Pull the patrol back and we can talk."</p><p class="ask">What do you say? Choose one of 3 answers, or skip (last card).</p><div class="opts">' + ''.join(XI_OPTS) + '</div>',
           '<button class="btn big">Next: Takaichi visits <span class="chev">›</span></button>')
write('layout-desk-m4.html', page('Layout, month 4', lap, ph, 'Month 4, thing 2 of 6, 5 recommended still to do.'))

# ======================= month 1: the crisis (thing 1 of 2) =======================
M1_OPTS = [
    opt('Joint patrol with Japan', '<span class="good">Keeps the Strait open (your goal).</span> Tension rises.', rec='your Defense Secretary: "It shows Beijing we will not back off, with Japan beside us."', more='Free. Japan relations +4. China relations -4.'),
    opt('Quiet message to Beijing', 'Tension falls. Taiwan trusts you less.', more='Free. Taiwan relations -5. The ships stay for now.'),
    opt('Sanctions on PLA firms · costs ◆ 1', '<span class="bad">China relations fall sharply: risks your goal "no war with China".</span>', more='Costs ◆ 1 of your 3. China relations -12, trade with China falls.'),
    skipcard('Skip for now: your cabinet decides', 'They go with the recommended answer, joint patrol with Japan. You can come back before you execute.'),
]
goal_s = '<p class="goal1"><b>Your goal.</b> You win if all three hold at the end of month 12: the Strait stays open, no war with China, and Japan stays on your side.</p>'
intro = '<p class="intro1">This month you have <b>2 things</b> to go through. For each one, choose an answer or skip it. Then check what will happen and execute.</p>'
M1_THINGS = [('PLA warships ring Taiwan', 'You are here · to do'), ('Recommended order: address the nation', 'To do · ◆ 1')]
M1_PLAN = plan([], [('Crisis: joint patrol with Japan', 'Tension rises'), ('Order: address the nation · ◆ 1', 'Approval about +3')], 'the crisis answer and 1 order (◆ 1)', [],
               ["The cabinet's answer to the crisis: joint patrol with Japan.", 'The recommended order does not run (◆ 1 stays).', "Your ministers take this month's 3 meetings (no effect)."], 1)
GOALS_M1 = facts('Your 3 goals, month 1', [('The Strait stays open', 'On track'), ('No war with China', 'On track'), ('Japan stays on your side', 'On track')], 'goals')
thing_m1 = f'''<div class="thing">
  <div class="sit">{goal_s}{intro}{hero('Crisis · urgent · 🇨🇳 China and 🇹🇼 Taiwan', 'PLA warships ring Taiwan', 'Thirty ships have closed the north channel for "drills". Taipei asks what you will do.', crisis=True)}{STORY_M1}</div>
  <div class="ans"><p class="ask">What do you do? Choose one of 3 answers, or skip (last card).</p><div class="opts">{''.join(M1_OPTS)}</div>{ADV_M1}</div>
  <div class="ctx"><div class="ctxmap">{STRAIT}<span class="cap">Taiwan Strait · thirty PLA ships</span></div>{GOALS_M1}
    <div class="bg"><h3 style="font-size:.9375rem;color:var(--text-2)">How a month works</h3><p>Go through the things on the left, one at a time. Each ends with your choice or a skip. On the right you see what will happen; Execute ends the month and the world answers.</p><button class="btn small">Read the briefing ›</button></div></div>
</div>'''
lap = state(1, show=False) + bar(1, 2, 'PLA warships ring Taiwan', 0, 'the recommended order', back=False, show=False, sub='0 of 2 done. Choose or skip each, then check and execute.') + f'''<main class="main" data-region="main">
  <aside class="col-list" data-region="list" aria-label="This month: 2 things"><h2>This month: 2 things</h2><p class="hint">Go through them in order, or open either.</p>{lrows(M1_THINGS)}
    <p class="flat"><b>Your ministers take this month's 3 meetings</b> (no effect). From month 2 you choose.</p><div class="grow"></div>{MISSION_PANEL}</aside>
  <section class="item" data-region="item" aria-label="1 of 2: PLA warships ring Taiwan">{thing_m1}</section>
  <aside class="plan" data-region="plan" aria-label="What will happen">{M1_PLAN}</aside>
</main>''' + deskstrip(2, "the cabinet answers the crisis, 1 order does not run, ministers take 3 meetings.", 1)
ph = phone('<span>Month <b>1</b></span><span class="pc">◆ <b>3 of 6</b></span><span>Things <b>0 of 2</b></span>', '1 of 2 · PLA warships ring Taiwan', '0 done, 2 to go',
           goal_s + intro + '<div class="ph-kick" style="color:#ff9a9c">Crisis · urgent</div><h1>PLA warships ring Taiwan</h1><p class="ph-quote">Thirty ships have closed the north channel. Taipei asks what you will do.</p><p class="ask">What do you do? Choose one of 3 answers, or skip (last card).</p><div class="opts">' + ''.join(M1_OPTS) + '</div>',
           '<button class="btn big">Next: the recommended order <span class="chev">›</span></button>')
write('layout-desk-m1.html', page('Layout, month 1', lap, ph, 'Month 1, the simple desk: goal sentence, 2 things.'))

# ======================= Map mode, month 4 =======================
world = '''<svg class="world" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <path d="M560 70 C760 40 1000 90 1110 180 C1150 270 1080 340 990 370 C950 420 900 470 840 480 C770 450 700 400 660 340 C600 280 530 200 560 70Z" fill="#2c3b2f" stroke="#41543f"/>
  <path d="M1170 220 C1200 250 1215 310 1190 370 C1180 340 1160 280 1170 220Z" fill="#33465a" stroke="#4d6680"/>
  <path d="M1030 470 C1046 482 1052 515 1036 538 C1026 520 1022 492 1030 470Z" fill="#3d5a7a" stroke="#6b93bd" stroke-width="2"/>
  <path d="M780 520 C840 560 890 620 870 710 C830 690 780 620 780 520Z" fill="#26332a" stroke="#3a4a3c"/>
  <path d="M980 450 C1000 470 1005 500 1000 525" stroke="#e5383b" stroke-width="3" stroke-dasharray="6 6" fill="none"/>
  <path d="M120 120 C260 90 380 130 420 220 C400 300 300 330 200 300 C120 260 80 190 120 120Z" fill="#2a352c" stroke="#3a4a3c"/>
</svg>'''
MAP_OPTS = [
    opt('Hold firm: the patrol stays', 'Keeps the Strait open. China -6.'),
    opt('Propose a hotline · ◆ 1', 'Tension falls a lot. China +5.', rec='your Secretary of State', cls='optrec'),
    opt('Offer a quiet pause', '<span class="bad">Hurts "Japan stays on side".</span>'),
    skipcard('Skip: your Foreign Minister answers', 'Free, China relations -3.'),
]
mapcard = f'<section class="mapcard" data-region="item" aria-label="2 of 6: Xi Jinping calls"><div class="st">2 of 6 · a call · 🇨🇳 China</div><h3>Xi Jinping calls</h3><p>"Pull the patrol back and we can talk."</p><p class="ask" style="font-size:1rem">Choose one of 3 answers, or skip.</p><div class="opts">{"".join(MAP_OPTS)}</div></section>'
strip = '''<div class="strip" data-region="plan">
  <button class="btn">☰ Review 5 recommended</button>
  <span class="grow"></span>
  <div class="endgrp"><span class="conseq"><b>If you execute now:</b> 1 decision, 4 meetings by ministers (China -3, Japan -2), 2 orders do not run.</span><button class="btn primary execmap">Execute month 4 <span class="sub">ends the month</span></button></div>
</div>'''
lap = state(4, mode='Map', show=False) + bar(2, 6, 'Xi Jinping calls', 1, 'Takaichi visits', show=False) + f'''<main class="mapmain" data-region="main">{world}
  <span class="pin" style="left:64%;top:55%"></span><span class="maplabel" style="left:65.6%;top:55%">Taiwan · drills</span><span class="maplabel" style="left:50%;top:26%">China</span><span class="maplabel" style="left:74%;top:30%">Japan</span>
  <div class="mapstage"><div class="mapleft">{mapcard}<aside class="maplist" data-region="list" aria-label="This month: all 6 things"><h2>This month: 6 things · 1 done</h2>{lrows(M4_THINGS)}</aside></div><div class="void"></div><aside class="mapplan plan" data-region="plan" aria-label="What will happen">{M4_PLAN}</aside></div>
  {strip}
</main>'''
ph = f'''<header class="ph-state" data-region="state">
  <div class="l1"><span>Month <b>4</b></span><span class="pc">◆ <b>3 of 6</b></span><span>Orders <b>0 of 6</b></span><span class="grow"></span><button class="btn small">State ▾</button></div>
  <div class="l2"><button class="btn small">Desk</button><span class="t"><b>2 of 6 · Map</b>1 done, 5 to go</span><button class="btn small">See all</button></div>
</header>
<div class="ph-map">{world.replace('class="world" ', '')}</div>
<main class="ph-body" data-region="item"><h1 style="font-size:22px">Xi Jinping calls</h1><div class="opts">{"".join(MAP_OPTS)}</div><button class="btn wide">☰ Review 5 recommended</button></main>
<div class="ph-bottom"><button class="btn below" hidden>More below</button><p>If you execute now: 1 decision happens, ministers take 4 meetings, 2 orders do not run.</p><button class="btn primary exec">Execute month 4 <span class="sub">ends the month</span></button></div>'''
write('layout-map.html', page('Layout, map', lap, ph, 'Map mode, month 4: card left, plan right from 1600, strip below 1600.'))
