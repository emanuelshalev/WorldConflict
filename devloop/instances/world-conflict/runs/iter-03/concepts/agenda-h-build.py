#!/usr/bin/env python3
"""Round 2 (D-70) concept mocks: writes agenda-h-*.html next to this file from shared fragments.
   python3 devloop/instances/world-conflict/runs/iter-03/concepts/agenda-h-build.py
Then: node devloop/instances/world-conflict/runs/iter-03/agenda-shots.mjs"""
from pathlib import Path

HERE = Path(__file__).parent


def page(title, lap, ph, note=''):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="stylesheet" href="agenda2.css">
</head>
<body>
<!-- Round 2 concept mock (D-70). {note} -->
<div class="lap">
{lap}
</div>
<div class="ph">
{ph}
</div>
</body>
</html>
'''


def hud(month1=False, mode='Desk'):
    other = 'Map' if mode == 'Desk' else 'Desk'
    tabs = f'<button class="on" role="tab" aria-selected="true">{mode}</button><button role="tab" aria-selected="false">{other}</button>'
    if mode == 'Map':
        tabs = '<button role="tab" aria-selected="false">Desk</button><button class="on" role="tab" aria-selected="true">Map</button>'
    return f'''<header class="hud">
  <span class="who">🇺🇸 President of the United States</span>
  <span class="s">Approval <b class="num">{'52' if month1 else '48'}%</b></span>
  <span class="s wide">Stability <b class="num">{'74' if month1 else '71'}</b></span>
  <span class="s">Political capital <b class="num">◆ 3 of 6</b></span><button class="btn info" aria-label="What is political capital?">?</button>
  <span class="s wide">World tension <b class="num">{'58' if month1 else '62'}</b></span>
  <span class="grow"></span>
  <div class="seg" role="tablist" aria-label="View">{tabs}</div>
</header>'''


def goal(month1=False, view='Guided', show_view=True):
    track = 'month 1 of 12' if month1 else '2 of 3 goals on track · month 4 of 12'
    seg = ''
    if show_view:
        g, f = ('on', '') if view == 'Guided' else ('', 'on')
        seg = f'<div class="seg" role="tablist" aria-label="How to go through the month"><button class="{g}" role="tab">Guided</button><button class="{f}" role="tab">Full desk</button></div>'
    return f'''<div class="goal">
  <span class="st">Mission</span><b>Keep the Strait open without a war</b><span class="st">{track}</span>
  <button class="btn small">Mission details <span class="chev">›</span></button>
  <span class="grow"></span>
  {seg}
</div>'''


HERO_SVG = '''<svg viewBox="0 0 800 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
  <path d="M0 150 Q200 138 400 150 T800 150 V200 H0Z" fill="#10233a"/>
  <rect x="470" y="30" width="300" height="140" rx="12" fill="#18304f"/>
  <path d="M560 170 q0 -60 60 -60 q60 0 60 60z" fill="#0f1d31"/><circle cx="620" cy="82" r="30" fill="#0f1d31"/>
  <rect x="490" y="44" width="40" height="26" rx="3" fill="#c8102e" opacity=".8"/>
</svg>'''

M4 = [  # (title, short, state)
    ('PLA drills close the north channel', 'PLA drills', 'done'),
    ('Xi Jinping calls', 'Xi Jinping calls', 'todo'),
    ('PM Takaichi visits', 'Takaichi visits', 'todo'),
    ('Routine meetings (2)', 'Routine meetings (2)', 'todo'),
    ('Orders your advisors propose (2)', 'Proposed orders (2)', 'todo'),
    ('Your own orders (optional)', 'Your own orders', 'todo'),
]


def stepbar(items, now, done_n, show=2, map_=False):
    """Done items collapse into one chip, the current one is wide, then up to `show` upcoming, then '+n more'."""
    chips = []
    if done_n:
        chips.append(f'<button class="chip done" aria-label="{done_n} done, open the list"><span class="n">✓</span><span class="t">{done_n} done</span></button>')
    for i, (title, short, _) in enumerate(items):
        n = i + 1
        if n == now:
            chips.append(f'<button class="chip now" aria-current="step"><span class="n">{n}</span><span class="t">Now: {short}</span></button>')
        elif now < n <= now + show:
            rank = ' r2' if n > now + 1 else ''
            chips.append(f'<button class="chip{rank}"><span class="n">{n}</span><span class="t">{short}</span></button>')
    rest = len(items) - min(len(items), now + show)
    rest_narrow = len(items) - min(len(items), now + 1)
    if rest > 0:
        chips.append(f'<button class="chip more wide">+{rest} more</button>')
    if rest_narrow > 0:
        chips.append(f'<button class="chip more narrow">+{rest_narrow} more</button>')
    lead = '' if map_ else f'<div class="lead"><b>Step 1: go through this month</b>{done_n} of {len(items)} done</div>'
    return f'''<nav class="stepbar" aria-label="This month">
  {lead}
  <div class="chips">{''.join(chips)}</div>
  <div class="ends"><button class="btn">All {len(items)} <span class="chev">▾</span></button><button class="btn">Review and execute <span class="chev">›</span></button></div>
</nav>'''


XI_OPTS = '''<div class="opts" role="list">
  <button class="opt"><span class="name">Hold firm: the patrol stays <span class="chev">Choose ›</span></span><span class="fx"><span class="good">Keeps the Strait open (your goal).</span> China relations -6. Tension rises.</span></button>
  <button class="opt"><span class="rec">★ Recommended by your Secretary of State</span><span class="name">Offer a quiet pause <span class="chev">Choose ›</span></span><span class="fx">Tension falls. <span class="bad">Japan trusts you less (-4): hurts your goal "Japan stays on side".</span></span></button>
  <button class="opt"><span class="name">Propose a hotline · costs ◆ 1 <span class="chev">Choose ›</span></span><span class="fx">Tension falls a lot. China relations +5.</span></button>
</div>'''
XI_SKIP_TEXT = 'Your Foreign Minister takes the call and says <b>"We note your concern."</b> Free, but China relations -3: Xi notices you did not call back.'


def rail(chosen, recs, skipped, exec_lines, month1=False):
    ch = ''.join(f'<div class="row"><span class="state done">✓</span><span class="t">{a}<small>{b}</small></span><button class="btn small">Change</button></div>' for a, b in chosen) or '<p class="st" style="margin:6px 0">Nothing yet.</p>'
    rc = ''.join(f'<div class="row"><span class="t">{a}<small>{b}</small></span><button class="btn small">Accept</button></div>' for a, b in recs)
    sk = ''.join(f'<div class="row"><span class="state skip">↷</span><span class="t">{a}<small>{b}</small></span><button class="btn small">Undo</button></div>' for a, b in skipped) or '<p class="st" style="margin:6px 0">Nothing skipped.</p>'
    accept_all = f'<button class="btn" style="width:100%;justify-content:center;margin-top:6px">Accept all {len(recs)} recommendations</button>' if len(recs) > 1 else ''
    budgets = '<div class="budget"><span>Political capital</span><b class="num">◆ 3 of 6 left</b></div>' if month1 else '<div class="budget"><span>Political capital</span><b class="num">◆ 3 of 6 left</b><span>Orders this month</span><b class="num">0 of 6</b><span>Meetings you take</span><b class="num">0 of 3</b><span>Defense budget</span><b class="num">12% used</b></div>'
    lines = ''.join(f'<li>{x}</li>' for x in exec_lines)
    return f'''<aside class="rail" aria-label="What will happen">
  <div class="top"><h2>Step 2: what will happen</h2><p>Your plan, updated as you go</p></div>
  <div class="list">
    <section><h2 class="sec">You chose</h2>{ch}</section>
    <section><h2 class="sec">Your advisors recommend ({len(recs)})</h2><p class="st" style="margin:2px 0 4px">Nothing here happens unless you accept it.</p>{rc}{accept_all}</section>
    <section><h2 class="sec">Skipped</h2>{sk}</section>
    <section style="border-bottom:0"><h2 class="sec">Budgets</h2>{budgets}</section>
  </div>
  <div class="exec"><h2>Step 3: execute</h2><p style="margin:0 0 4px;font-size:16px"><b>If you execute now:</b></p><ul>{lines}</ul><button class="btn primary big">Execute month</button></div>
</aside>'''


M4_RECS = [('Takaichi visit: reaffirm the alliance', 'Japan on side +3'), ('Court India · ◆ 1', 'India relations +6, approval +2'), ('Intelligence on China · ◆ 1', 'Sharper estimates for 3 months')]
M4_EXEC = ['Your choice on the PLA drills happens.', 'Your ministers take 4 meetings for you. <span class="bad">China -3, Japan -2.</span>', '2 proposed orders do not run (◆ 2 stay).']


def phone_item(top_t, top_b, kick, title, quote, opts, skip_label, skip_text, next_label, goal_line=''):
    return f'''<div class="ph-top"><button class="btn small" aria-label="Back">‹</button><span class="t"><b>{top_b}</b>{top_t}</span><button class="btn small">List</button></div>
<div class="ph-body">
  {goal_line}
  <div class="ph-kick">{kick}</div>
  <h1>{title}</h1>
  <p class="ph-quote">{quote}</p>
  <p class="ask" style="font-size:18px">What do you say?</p>
  {opts}
  <div class="ph-skip"><button class="btn">{skip_label}</button><p>{skip_text}</p></div>
</div>
<div class="ph-bottom"><button class="btn big">{next_label} <span class="chev">›</span></button></div>'''


def write(name, html):
    (HERE / name).write_text(html)
    print(name)


# ---------------- month 4, guided (hybrid) ----------------
centre_xi = f'''<section class="item" aria-label="2 of 6: Xi Jinping calls">
  <div class="where"><button class="btn small">‹ Back</button><span>2 of 6 · a call</span><span class="grow"></span><button class="btn small">Next: Takaichi visits ›</button></div>
  <div class="hero">{HERO_SVG}<div class="shade"></div><div class="txt"><div class="kick">A call on the secure line · 🇨🇳 China</div><h1>Xi Jinping calls</h1><p>"Your ships are sailing into a storm. Pull the patrol back and we can talk about the exercise."</p></div></div>
  <p class="ask">What do you say? Pick one.</p>
  {XI_OPTS}
  <div class="skiprow"><button class="btn">Skip this call</button><p>{XI_SKIP_TEXT}</p></div>
</section>'''
lap = hud() + goal() + stepbar(M4, 2, 1) + f'<main class="desk">{centre_xi}{rail([("Joint patrol with Japan", "PLA drills close the north channel")], M4_RECS, [], M4_EXEC)}</main>'
ph = phone_item('1 of 6 done', '2 of 6 · Xi Jinping calls', 'A call on the secure line · 🇨🇳 China', 'Xi Jinping calls', '"Your ships are sailing into a storm. Pull the patrol back and we can talk."', XI_OPTS, 'Skip this call', XI_SKIP_TEXT, 'Next: Takaichi visits')
write('agenda-h-desk-m4.html', page('Agenda round 2, month 4', lap, ph, 'Hybrid: B step bar (done collapsed, +n more, ends fixed) with A full list one tap away. Month 4, item 2 of 6.'))

# ---------------- month 4, full list open ----------------
rows = []
for i, (title, _, s) in enumerate(M4):
    n = i + 1
    cls, state = ('done', '<span class="state done">✓ You chose: joint patrol with Japan</span>') if s == 'done' else (('now', '<span class="state todo">Now · to do</span>') if n == 2 else ('', '<span class="state todo">To do</span>'))
    if n == 6:
        state = '<span class="state skip">Optional</span>'
    rows.append(f'<button class="lrow {cls}"><span class="n">{"✓" if s == "done" else n}</span><span class="t"><b>{title}</b>{state}</span><span class="chev">›</span></button>')
panel = f'<div class="listpanel" role="dialog" aria-label="All 6 things this month"><h2>This month: all 6</h2><p class="st" style="margin:0 0 4px">1 of 6 done. Press any one to go to it.</p>{"".join(rows)}<button class="btn primary" style="justify-content:center">Review and execute ›</button></div>'
lap = hud() + goal() + stepbar(M4, 2, 1) + f'<main class="desk" style="position:relative">{centre_xi}{rail([("Joint patrol with Japan", "PLA drills close the north channel")], M4_RECS, [], M4_EXEC)}</main>' + panel
ph_rows = ''.join(r for r in rows)
ph = f'''<div class="ph-top"><button class="btn small" aria-label="Back">‹</button><span class="t"><b>2 of 6 · Xi Jinping calls</b>1 of 6 done</span><button class="btn small">List</button></div>
<div class="ph-body"><div class="ph-kick">A call on the secure line</div><h1>Xi Jinping calls</h1></div>
<div class="ph-dim"></div>
<div class="ph-sheet" role="dialog" aria-label="All 6 things this month"><div style="display:flex;align-items:center"><b style="flex:1;font-size:20px">This month: all 6</b><button class="btn small">Close</button></div>{ph_rows}<button class="btn primary big">Review and execute ›</button></div>'''
write('agenda-h-list.html', page('Agenda round 2, full list', lap, ph, 'The full list (variant A) one tap away from the step bar: All 6.'))

# ---------------- month 1 ----------------
M1 = [('PLA warships ring Taiwan', 'PLA warships ring Taiwan', 'todo'), ('Order your advisors propose (1)', 'Proposed order (1)', 'todo')]
M1_OPTS = '''<div class="opts">
  <button class="opt"><span class="rec">★ Recommended by your Defense Secretary</span><span class="name">Joint patrol with Japan <span class="chev">Choose ›</span></span><span class="fx"><span class="good">Keeps the Strait open (your goal).</span> Tension rises.</span></button>
  <button class="opt"><span class="name">Quiet message to Beijing <span class="chev">Choose ›</span></span><span class="fx">Tension falls. Taiwan trusts you less.</span></button>
  <button class="opt"><span class="name">Sanctions on PLA firms · costs ◆ 1 <span class="chev">Choose ›</span></span><span class="fx"><span class="bad">China relations fall sharply: risks your goal "no war with China".</span></span></button>
</div>'''
M1_SKIP = 'Your cabinet goes with its recommendation, <b>Joint patrol with Japan</b>. You can come back before you execute.'
goal_sentence = '<p class="ph-goal" style="font-size:17px"><b>Your goal.</b> You win if all three hold at the end of month 12: the Strait stays open, no war with China, and Japan stays on your side.</p>'
centre_m1 = f'''<section class="item" aria-label="1 of 2: PLA warships ring Taiwan">
  <p style="margin:0 0 14px;font-size:18px;padding:12px 16px;border-left:3px solid var(--good);background:var(--surface-1)"><b>Your goal.</b> You win if all three hold at the end of month 12: the Strait stays open, no war with China, and Japan stays on your side.</p>
  <p style="margin:0 0 12px;font-size:17px">This month you have <b>2 things</b> to go through. For each one, pick an answer or skip it.</p>
  <div class="where"><span>1 of 2 · a crisis</span><span class="grow"></span><button class="btn small">Next: proposed order ›</button></div>
  <div class="hero" style="box-shadow: inset 0 0 0 2px var(--war)"><svg viewBox="0 0 800 200" preserveAspectRatio="xMidYMid slice" aria-hidden><path d="M0 140 Q200 128 400 140 T800 140 V200 H0Z" fill="#10233a"/><path d="M430 70 q30 -30 60 0 q-10 40 -30 60 q-25 -20 -30 -60z" fill="#2a3d55"/><g fill="#8fa0b8"><path d="M120 128 h70 l-10 10 h-52z"/><path d="M260 112 h60 l-8 9 h-44z"/><path d="M600 124 h66 l-9 10 h-50z"/></g></svg><div class="shade"></div><div class="txt"><div class="kick" style="color:#ff9a9c">Crisis · urgent · 🇨🇳 China and 🇹🇼 Taiwan</div><h1>PLA warships ring Taiwan</h1><p>Thirty ships have closed the north channel for "drills". Taipei asks what you will do.</p></div></div>
  <p class="ask">What do you do? Pick one.</p>
  {M1_OPTS}
  <div class="skiprow"><button class="btn">Skip for now</button><p>{M1_SKIP}</p></div>
</section>'''
m1_rail = rail([], [('Address the nation · ◆ 1', 'Approval about +3')], [], ['The cabinet\'s answer to the crisis: <b>joint patrol with Japan</b>.', 'The proposed order does not run (◆ 1 stays).', 'Your ministers take this month\'s 3 meetings (no effect).'], month1=True)
lap = hud(True) + goal(True, show_view=False) + stepbar(M1, 1, 0) + f'<main class="desk">{centre_m1}{m1_rail}</main>'
ph = phone_item('Month 1 · 2 things to go through', '1 of 2 · the crisis', 'Crisis · urgent', 'PLA warships ring Taiwan', 'Thirty ships have closed the north channel. Taipei asks what you will do.', M1_OPTS, 'Skip for now', M1_SKIP, 'Next: proposed order', goal_sentence)
write('agenda-h-desk-m1.html', page('Agenda round 2, month 1', lap, ph, 'Month 1: 2 things, goal sentence, routine meetings taken care of and named in the Execute area.'))

# ---------------- skip (routine meetings group) ----------------
centre_skip = f'''<section class="item" aria-label="4 of 6: routine meetings">
  <div class="status" role="status"><span><b>Skipped: Xi Jinping's call.</b> Your Foreign Minister takes it ("We note your concern"). China relations -3.</span><button class="btn small">Undo</button></div>
  <div class="where"><button class="btn small">‹ Back</button><span>4 of 6 · two routine meetings, grouped</span><span class="grow"></span><button class="btn small">Next: proposed orders ›</button></div>
  <p class="ask" style="font-size:24px;margin-bottom:6px">Routine meetings this month</p>
  <p style="margin:0 0 14px;font-size:17px;color:var(--text-2)">Nothing in them touches your goals. Most leaders let their ministers take them.</p>
  <div class="opts">
    <button class="opt"><span class="rec">★ Recommended</span><span class="name">Let your ministers take both <span class="chev">Choose ›</span></span><span class="fx">Defense Secretary: readiness briefing (no effect). Press office: CNN interview, "no comment on the Strait" (no effect). Free.</span></button>
    <button class="opt"><span class="name">Open them one by one <span class="chev">Open ›</span></span><span class="fx">Take the readiness briefing or the CNN interview yourself (each uses 1 of your 3 meetings).</span></button>
  </div>
</section>'''
SKIP_RAIL = rail([("Joint patrol with Japan", "PLA drills"), ("Takaichi visit: reaffirm the alliance", "You meet her")], M4_RECS[1:], [("Xi Jinping calls", "Your Foreign Minister answers. China -3")], ["Your 2 choices happen.", 'Your ministers take 3 meetings for you. <span class="bad">China -3.</span>', "2 proposed orders do not run (◆ 2 stay)."])
lap = hud() + goal() + stepbar(M4, 4, 3) + f'<main class="desk">{centre_skip}{SKIP_RAIL}</main>'
ph_opts = '''<div class="opts"><button class="opt"><span class="rec">★ Recommended</span><span class="name">Let your ministers take both <span class="chev">Choose ›</span></span><span class="fx">Readiness briefing and CNN interview: no effect, free.</span></button><button class="opt"><span class="name">Open them one by one <span class="chev">Open ›</span></span><span class="fx">Each uses 1 of your 3 meetings.</span></button></div>'''
ph = f'''<div class="ph-top"><button class="btn small" aria-label="Back">‹</button><span class="t"><b>4 of 6 · routine meetings</b>3 of 6 done</span><button class="btn small">List</button></div>
<div class="ph-body"><div class="status" role="status" style="display:grid;gap:8px"><span><b>Skipped: Xi's call.</b> Your Foreign Minister takes it. China relations -3.</span><button class="btn small">Undo</button></div>
<h1>Routine meetings</h1><p class="ph-quote">Nothing in them touches your goals.</p>{ph_opts}</div>
<div class="ph-bottom"><button class="btn big">Next: proposed orders <span class="chev">›</span></button></div>'''
write('agenda-h-skip.html', page('Agenda round 2, skip', lap, ph, 'After Skip on Xi: the status line names the default answer and its cost; routine meetings grouped into one item.'))

# ---------------- full desk (expert default from month 4 once switched) ----------------
lrows = []
for i, (title, _, s) in enumerate(M4):
    n = i + 1
    cls = 'done' if s == 'done' else ('now' if n == 2 else '')
    state = '<span class="state done">✓ You chose</span>' if s == 'done' else ('<span class="state todo">Now · to do</span>' if n == 2 else ('<span class="state skip">Optional</span>' if n == 6 else '<span class="state todo">To do</span>'))
    lrows.append(f'<button class="lrow {cls}"><span class="n">{"✓" if s == "done" else n}</span><span class="t"><b>{title}</b>{state}</span><span class="chev">›</span></button>')
col_list = f'<aside class="col-list" aria-label="This month: all 6"><h2 class="sec" style="font-size:17px;color:var(--text-1)">This month · 1 of 6 done</h2>{"".join(lrows)}</aside>'
centre_full = centre_xi.replace('<div class="where">', '<div class="banner"><span>Full desk is now your default: no auto-advance, everything in view. Prefer one at a time?</span><button class="btn small">Back to Guided</button></div><div class="where">', 1)
lap = hud() + goal(view='Full desk') + f'<main class="full">{col_list}{centre_full}{rail([("Joint patrol with Japan", "PLA drills close the north channel")], M4_RECS, [], M4_EXEC)}</main>'
ph = phone_item('Full desk is a laptop view; phones stay one at a time', '2 of 6 · Xi Jinping calls', 'A call on the secure line', 'Xi Jinping calls', '"Pull the patrol back and we can talk."', XI_OPTS, 'Skip this call', XI_SKIP_TEXT, 'Next: Takaichi visits')
write('agenda-h-fulldesk.html', page('Agenda round 2, full desk', lap, ph, 'Full desk for experts: default from month 4 once the player has switched once; A layout, no auto-advance.'))

# ---------------- review (step 2 as a page) ----------------
review = '''<section class="review" aria-label="Review your month">
  <h1>Your month, before you execute</h1>
  <p class="intro">All 6 gone through. This is exactly what will happen.</p>
  <section><h2 class="sec">You chose (3)</h2>
    <div class="row"><span class="state done">✓</span><span class="t">Joint patrol with Japan<small>PLA drills close the north channel</small></span><button class="btn small">Change</button></div>
    <div class="row"><span class="state done">✓</span><span class="t">Hold firm with Xi: the patrol stays<small>You take the call</small></span><button class="btn small">Change</button></div>
    <div class="row"><span class="state done">✓</span><span class="t">Reaffirm the alliance with Japan<small>You meet PM Takaichi</small></span><button class="btn small">Change</button></div></section>
  <section><h2 class="sec">You accepted (2)</h2>
    <div class="row"><span class="state rec">★</span><span class="t">Court India · ◆ 1<small>India relations +6, approval +2</small></span><button class="btn small">Change</button></div>
    <div class="row"><span class="state rec">★</span><span class="t">Ministers take the 2 routine meetings<small>No effect</small></span><button class="btn small">Change</button></div></section>
  <section><h2 class="sec">You skipped (1)</h2>
    <div class="row"><span class="state skip">↷</span><span class="t">Intelligence on China<small>Does not run. ◆ 1 stays</small></span><button class="btn small">Undo</button></div></section>
  <div class="final"><h2>Execute month 4</h2><ul><li>Your 5 decisions happen.</li><li>You spend ◆ 1 of 3; ◆ 2 carry over (next month ◆ 5).</li><li>The world moves: 12 other governments act.</li></ul><button class="btn primary big">Execute month</button></div>
</section>'''
lap = hud() + goal() + stepbar(M4, 7, 6).replace('<b>Step 1: go through this month</b>6 of 6 done', '<b>Step 2: review</b>6 of 6 done') + f'<main>{review}</main>'
ph = f'''<div class="ph-top"><button class="btn small" aria-label="Back">‹</button><span class="t"><b>Review your month</b>6 of 6 done</span><button class="btn small">List</button></div>
<div class="ph-body">{review.replace('class="review"', 'class="review" style="padding:0"')}</div>'''
write('agenda-h-review.html', page('Agenda round 2, review', lap, ph, 'Step 2 as its own page when everything is gone through: what happens, in words, with Execute in the main area.'))

# ---------------- map mode ----------------
world = '''<svg class="world" viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice" aria-hidden>
  <path d="M520 60 C700 40 900 80 1000 160 C1040 240 980 300 900 330 C860 380 820 420 760 430 C700 400 640 360 600 300 C540 250 480 180 520 60Z" fill="#2c3b2f" stroke="#41543f"/>
  <path d="M1060 200 C1090 230 1100 280 1080 330 C1070 300 1050 250 1060 200Z" fill="#33465a" stroke="#4d6680"/>
  <path d="M930 420 C945 430 950 460 935 480 C925 465 922 440 930 420Z" fill="#3d5a7a" stroke="#6b93bd" stroke-width="2"/>
  <path d="M700 470 C760 500 800 560 780 640 C740 620 700 560 700 470Z" fill="#26332a" stroke="#3a4a3c"/>
  <path d="M880 400 C900 420 905 450 900 470" stroke="#e5383b" stroke-width="3" stroke-dasharray="6 6" fill="none"/>
</svg>'''
mapcard = f'''<section class="mapcard" aria-label="2 of 6: Xi Jinping calls"><div class="st">2 of 6 · a call · 🇨🇳 China</div><h3>Xi Jinping calls</h3><p>"Pull the patrol back and we can talk about the exercise."</p>
{XI_OPTS}
<div style="display:grid;gap:6px"><button class="btn">Skip this call</button><p style="font-size:15px">Your Foreign Minister answers "We note your concern." Free, China relations -3.</p></div></section>'''
strip = '''<div class="strip"><span class="st">Political capital <b class="num">◆ 3 of 6</b></span><span class="st">Meetings you take <b class="num">0 of 3</b></span>
<button class="btn">3 recommendations to check <span class="chev">›</span></button><span class="grow"></span>
<span class="conseq"><b>If you execute now:</b> your 1 choice happens, ministers take 4 meetings (China -3, Japan -2), 2 proposed orders do not run.</span>
<button class="btn primary" style="min-height:52px;font-size:17px">Execute month</button></div>'''
lap = hud(mode='Map') + goal(show_view=False) + f'<div class="map">{world}<span class="pin" style="left:928px;top:438px"></span><span class="maplabel" style="left:950px;top:440px">Taiwan · drills</span><span class="maplabel" style="left:720px;top:220px">China</span><span class="maplabel" style="left:1100px;top:250px">Japan</span>{stepbar(M4, 2, 1, show=2, map_=True)}{mapcard}{strip}</div>'
ph = f'''<div class="ph-top"><button class="btn small">Desk</button><span class="t"><b>2 of 6 · Xi Jinping calls</b>Map · 1 of 6 done</span><button class="btn small">List</button></div>
<div class="ph-map">{world.replace('class="world" ', '')}</div>
<div class="ph-body" style="padding-top:12px"><div class="ph-kick">A call · 🇨🇳 China</div><h1 style="font-size:22px">Xi Jinping calls</h1>{XI_OPTS}<div class="ph-skip"><button class="btn">Skip this call</button><p>Your Foreign Minister answers. Free, China relations -3.</p></div></div>
<div class="ph-bottom"><p>If you execute now: 1 choice happens, ministers take 4 meetings, 2 orders do not run.</p><button class="btn primary big">Execute month</button></div>'''
write('agenda-h-map.html', page('Agenda round 2, map', lap, ph, 'Map mode: the same step bar, the current thing as a floating card, recommendations open a list (no one-press approve), Execute consequence in words.'))
