#!/usr/bin/env python3
"""Agenda concept mocks, round 2 layout with the round 3 clickability fixes (D-70, D-72).
Writes agenda-h-*.html next to this file from shared fragments.
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
<!-- Concept mock (D-70 layout, D-72 fixes). {note} -->
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
    d, m = ('on', '') if mode == 'Desk' else ('', 'on')
    return f'''<header class="hud">
  <span class="who">🇺🇸 President of the United States</span>
  <span class="s">Approval <b class="num">{'52' if month1 else '48'}%</b></span>
  <span class="s wide">Stability <b class="num">{'74' if month1 else '71'}</b></span>
  <span class="s">Political capital<span class="wide"> (what orders cost)</span> <b class="num">◆ 3 of 6</b></span><button class="btn small hudx">Explain</button>
  <span class="s wide">World tension <b class="num">{'58' if month1 else '62'}</b></span>
  <span class="grow"></span>
  <div class="seg" role="tablist" aria-label="View"><button class="{d}" role="tab">Desk</button><button class="{m}" role="tab">Map</button></div>
</header>'''


def goal(month1=False, view='one', show_view=True):
    track = 'month 1 of 12' if month1 else '2 of 3 goals on track · month 4 of 12'
    seg = ''
    if show_view:
        a, b = ('on', '') if view == 'one' else ('', 'on')
        seg = f'<span class="st showlbl">Show:</span><div class="seg" role="tablist" aria-label="Show one thing at a time or everything"><button class="{a}" role="tab">One at a time</button><button class="{b}" role="tab">Everything</button></div>'
    return f'''<div class="goal">
  <button class="btn goalbtn"><span>Mission: <b>Keep the Strait open without a war</b> · <span class="muted">{track}</span></span><span class="chev">Open ›</span></button>
  <span class="grow"></span>
  {seg}
</div>'''


M4 = ['PLA drills close the north channel', 'Xi Jinping calls', 'PM Takaichi visits', 'Small meetings (2)', 'Recommended orders (2)', 'Your own orders (optional)']


def bar(now, total, title, done, next_title=None, back=True, review=False):
    """Plain sentence on the left, real buttons on the right. No chips, no numbers in circles, no progress bars."""
    left = f'<span class="t"><b>{now} of {total}: {title}</b>{done} done, {total - done} to go</span>' if not review else f'<span class="t"><b>Check what will happen</b>{done} of {total} gone through</span>'
    nb = f'<button class="btn">Next<span class="wide">: {next_title}</span> <span class="chev">›</span></button>' if next_title else ''
    bb = '<button class="btn">‹ Back</button>' if back else ''
    return f'''<nav class="bar2" aria-label="This month">
  {left}
  <span class="grow"></span>
  {bb}{nb}<button class="btn">See all {total} <span class="chev">▾</span></button>{'' if review else '<button class="btn">Check and execute <span class="chev">›</span></button>'}
</nav>'''


HERO = '''<div class="hero"><svg viewBox="0 0 800 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
  <path d="M0 150 Q200 138 400 150 T800 150 V200 H0Z" fill="#10233a"/>
  <rect x="470" y="30" width="300" height="140" rx="12" fill="#18304f"/>
  <path d="M560 170 q0 -60 60 -60 q60 0 60 60z" fill="#0f1d31"/><circle cx="620" cy="82" r="30" fill="#0f1d31"/>
  <rect x="490" y="44" width="40" height="26" rx="3" fill="#c8102e" opacity=".8"/>
</svg><div class="shade"></div><div class="txt"><div class="kick">A call on the secure line · 🇨🇳 China</div><h1>Xi Jinping calls</h1><p>"Your ships are sailing into a storm. Pull the patrol back and we can talk about the exercise."</p></div></div>'''


def opt(name, fx, rec=None, chosen=False):
    r = f'<span class="rec">★ Recommended by {rec}</span>' if rec else ''
    return f'<button class="opt{" chosen" if chosen else ""}"><span class="body">{r}<span class="name">{name}</span><span class="fx">{fx}</span></span><span class="face">Choose</span></button>'


def skipcard(label, fx):
    return f'<p class="or">Or, if you do not want to decide:</p><button class="opt skipopt"><span class="body"><span class="name">{label}</span><span class="fx">{fx}</span></span><span class="face">Skip</span></button>'


XI_OPTS = '<div class="opts">' + opt('Hold firm: the patrol stays', '<span class="good">Keeps the Strait open (your goal).</span> China relations -6. Tension rises.') + \
    opt('Propose a hotline · costs ◆ 1', 'Tension falls a lot. China relations +5. No goal is hurt.', rec='your Secretary of State: "It cools things down and costs Japan nothing."') + \
    opt('Offer a quiet pause', 'Tension falls. <span class="bad">Japan trusts you less (-4): hurts your goal "Japan stays on side".</span>') + \
    skipcard('Skip this call: your Foreign Minister answers', 'She says "We note your concern." Free, but China relations -3 because Xi notices you did not call back.') + '</div>'


def rail(chosen, recs, skipped, exec_lines, month1=False, month='4'):
    ch = ''.join(f'<div class="row"><span class="t">You chose: {a}<small>{b}</small></span><button class="btn small">Change</button></div>' for a, b in chosen) or '<p class="st" style="margin:6px 0">Nothing yet.</p>'
    rc = ''.join(f'<div class="row"><span class="t">{a}<small>{b}</small></span><button class="btn small">Open ›</button></div>' for a, b in recs)
    sk = ''.join(f'<div class="row"><span class="t">Skipped: {a}<small>{b}</small></span><button class="btn small">Undo</button></div>' for a, b in skipped) or '<p class="st" style="margin:6px 0">Nothing skipped.</p>'
    acc = '<button class="btn" style="width:100%;justify-content:center;margin-top:6px">Accept all recommended</button><p class="st" style="margin:4px 0 0">Chooses the recommended answer for every thing still to do.</p>' if recs else ''
    budgets = '<div class="budget"><span>Political capital (◆)</span><b class="num">3 of 6 left</b></div>' if month1 else '<div class="budget"><span>Political capital (◆)</span><b class="num">3 of 6 left</b><span>Orders this month</span><b class="num">0 of 6</b><span>Meetings you take</span><b class="num">0 of 3</b><span>Defense budget</span><b class="num">12% used</b></div>'
    lines = ''.join(f'<li>{x}</li>' for x in exec_lines)
    return f'''<aside class="rail" aria-label="What will happen">
  <div class="list">
    <h2 class="railh">What will happen</h2>
    <section><h3 class="sec">Decided</h3>{ch}</section>
    <section><h3 class="sec">Recommended ({len(recs)}), still to do</h3>{rc}{acc}</section>
    <section><h3 class="sec">Skipped</h3>{sk}</section>
    <section style="border-bottom:0"><h3 class="sec">Budgets</h3>{budgets}</section>
  </div>
  <div class="exec"><p style="margin:0 0 4px;font-size:16px"><b>If you execute now:</b></p><ul>{lines}</ul><button class="btn primary big">Execute month {month} <span class="exsub">ends the month</span></button></div>
</aside>'''


M4_RECS = [('Xi call: propose a hotline · ◆ 1', 'China +5'), ('Takaichi visit: reaffirm the alliance', 'Japan on side +3'), ('Recommended orders: Court India, Intelligence on China', '◆ 2 in all')]
M4_EXEC = ['Your answer to the PLA drills happens.', 'Your ministers take 4 meetings for you. <span class="bad">China -3, Japan -2.</span>', 'The 2 recommended orders do not run (◆ 2 stay for next month).']


def phone(top_b, top_t, body, bottom):
    return f'''<div class="ph-top"><button class="btn small" aria-label="Back">‹ Back</button><span class="t"><b>{top_b}</b>{top_t}</span><button class="btn small">See all</button></div>
<div class="ph-body">{body}</div>
<div class="ph-bottom">{bottom}</div>'''


def write(name, html):
    (HERE / name).write_text(html)
    print(name)


# ---------------- month 4 ----------------
centre_xi = f'''<section class="item" aria-label="2 of 6: Xi Jinping calls">
  {HERO}
  <p class="ask">What do you say? Choose one of 3 answers, or skip (last card).</p>
  {XI_OPTS}
</section>'''
lap = hud() + goal() + bar(2, 6, 'Xi Jinping calls', 1, 'Takaichi visits') + f'<main class="desk">{centre_xi}{rail([("Joint patrol with Japan", "PLA drills close the north channel")], M4_RECS, [], M4_EXEC)}</main>'
ph = phone('2 of 6', '1 done, 5 to go', '<div class="ph-kick">A call on the secure line · 🇨🇳 China</div><h1>Xi Jinping calls</h1><p class="ph-quote">"Your ships are sailing into a storm. Pull the patrol back and we can talk."</p><p class="ask">What do you say? Choose one of 3 answers, or skip (last card).</p>' + XI_OPTS, '<button class="btn big">Next: Takaichi visits <span class="chev">›</span></button>')
write('agenda-h-desk-m4.html', page('Agenda, month 4', lap, ph, 'Month 4, thing 2 of 6. Skip is the last card of the list; the bar is a sentence plus buttons.'))

# ---------------- See all (the full list one tap away) ----------------
def lrows(now=2, done=1):
    out = []
    for i, t in enumerate(M4):
        n = i + 1
        if n <= done:
            st, cls = 'Decided: joint patrol with Japan', 'done'
        elif n == now:
            st, cls = 'You are here · to do', 'now'
        elif n == 6:
            st, cls = 'Optional', ''
        else:
            st, cls = 'To do', ''
        out.append(f'<button class="lrow {cls}"><span class="t"><b>{t}</b><span class="lst">{st}</span></span><span class="face">Open</span></button>')
    return ''.join(out)


panel = f'<div class="listpanel" role="dialog" aria-label="All 6 things this month"><div style="display:flex;align-items:center;gap:8px"><b style="flex:1;font-size:18px">This month: all 6 things</b><button class="btn small">Close</button></div>{lrows()}<button class="btn primary" style="justify-content:center">Check and execute ›</button></div>'
lap = hud() + goal() + bar(2, 6, 'Xi Jinping calls', 1, 'Takaichi visits') + f'<main class="desk" style="position:relative">{centre_xi}{rail([("Joint patrol with Japan", "PLA drills close the north channel")], M4_RECS, [], M4_EXEC)}</main>' + panel
ph = f'''<div class="ph-top"><button class="btn small">‹ Back</button><span class="t"><b>2 of 6</b>1 done, 5 to go</span><button class="btn small">See all</button></div>
<div class="ph-body"><h1>Xi Jinping calls</h1></div><div class="ph-dim"></div>
<div class="ph-sheet" role="dialog" aria-label="All 6 things this month"><div style="display:flex;align-items:center"><b style="flex:1;font-size:20px">This month: all 6</b><button class="btn small">Close</button></div>{lrows()}<button class="btn primary big">Check and execute ›</button></div>'''
write('agenda-h-list.html', page('Agenda, see all', lap, ph, 'The full list one tap away: rows are buttons with an Open face, no numbered circles.'))

# ---------------- month 1 ----------------
M1_OPTS = '<div class="opts">' + opt('Joint patrol with Japan', '<span class="good">Keeps the Strait open (your goal).</span> Tension rises.', rec='your Defense Secretary: "It shows Beijing we will not back off, with Japan beside us."') + \
    opt('Quiet message to Beijing', 'Tension falls. Taiwan trusts you less.') + \
    opt('Sanctions on PLA firms · costs ◆ 1', '<span class="bad">China relations fall sharply: risks your goal "no war with China".</span>') + \
    skipcard('Skip for now: your cabinet decides', 'They go with the recommended answer, joint patrol with Japan. You can come back before you execute.') + '</div>'
intro = '<p class="intro1">This month you have <b>2 things</b> to go through. For each one, choose an answer or skip it. Then check what will happen and execute.</p>'
goal_s = '<p class="goal1"><b>Your goal.</b> You win if all three hold at the end of month 12: the Strait stays open, no war with China, and Japan stays on your side.</p>'
centre_m1 = f'''<section class="item">{goal_s}{intro}
  <div class="hero" style="box-shadow: inset 0 0 0 2px var(--war)"><svg viewBox="0 0 800 200" preserveAspectRatio="xMidYMid slice" aria-hidden><path d="M0 140 Q200 128 400 140 T800 140 V200 H0Z" fill="#10233a"/><path d="M430 70 q30 -30 60 0 q-10 40 -30 60 q-25 -20 -30 -60z" fill="#2a3d55"/><g fill="#8fa0b8"><path d="M120 128 h70 l-10 10 h-52z"/><path d="M260 112 h60 l-8 9 h-44z"/><path d="M600 124 h66 l-9 10 h-50z"/></g></svg><div class="shade"></div><div class="txt"><div class="kick" style="color:#ff9a9c">Crisis · urgent · 🇨🇳 China and 🇹🇼 Taiwan</div><h1>PLA warships ring Taiwan</h1><p>Thirty ships have closed the north channel for "drills". Taipei asks what you will do.</p></div></div>
  <p class="ask">What do you do? Choose one of 3 answers, or skip (last card).</p>{M1_OPTS}</section>'''
m1_rail = rail([], [('Crisis: joint patrol with Japan', 'Tension rises'), ('Recommended order: address the nation · ◆ 1', 'Approval about +3')], [], ["The cabinet's answer to the crisis: joint patrol with Japan.", 'The recommended order does not run (◆ 1 stays).', "Your ministers take this month's 3 meetings (no effect)."], month1=True, month='1')
lap = hud(True) + goal(True, show_view=False) + bar(1, 2, 'PLA warships ring Taiwan', 0, 'the recommended order', back=False) + f'<main class="desk">{centre_m1}{m1_rail}</main>'
ph = phone('1 of 2', 'Month 1 · 0 done, 2 to go', goal_s + intro + '<div class="ph-kick">Crisis · urgent</div><h1>PLA warships ring Taiwan</h1><p class="ph-quote">Thirty ships have closed the north channel. Taipei asks what you will do.</p><p class="ask">What do you do? Choose one of 3 answers, or skip (last card).</p>' + M1_OPTS, '<button class="btn big">Next: the recommended order <span class="chev">›</span></button>')
write('agenda-h-desk-m1.html', page('Agenda, month 1', lap, ph, 'Month 1: goal sentence, a plain intro, 2 things.'))

# ---------------- skip ----------------
SMALL_OPTS = '<div class="opts">' + opt('Let your ministers take both', 'Readiness briefing: your Defense Secretary goes (no effect). CNN interview: your press office says "no comment on the Strait" (no effect). Free.', rec='your Chief of Staff: "Neither touches your goals."') + \
    '<button class="opt"><span class="body"><span class="name">Take them yourself, one by one</span><span class="fx">Each one uses 1 of your 3 meetings.</span></span><span class="face">Choose</span></button></div>'
status = '<div class="status" role="status"><span><b>Skipped: Xi Jinping\'s call.</b> Your Foreign Minister answers "We note your concern." China relations -3.</span><button class="btn small">Undo</button></div>'
centre_skip = f'''<section class="item">{status}
  <p class="ask" style="font-size:24px;margin-bottom:4px">Two small meetings this month</p>
  <p style="margin:0 0 14px;font-size:17px;color:var(--text-2)">They need no decision from you: nothing in them touches your goals.</p>
  {SMALL_OPTS}</section>'''
SKIP_RAIL = rail([('Joint patrol with Japan', 'PLA drills'), ('Reaffirm the alliance', 'PM Takaichi visits')], M4_RECS[2:], [('Xi Jinping calls', 'Your Foreign Minister answers. China -3')], ['Your 2 decisions happen.', 'Your ministers take 3 meetings for you. <span class="bad">China -3.</span>', 'The 2 recommended orders do not run (◆ 2 stay).'])
lap = hud() + goal() + bar(4, 6, 'Small meetings (2)', 3, 'Recommended orders') + f'<main class="desk">{centre_skip}{SKIP_RAIL}</main>'
ph = phone('4 of 6', '3 done, 3 to go', status.replace('class="status"', 'class="status" style="display:grid;gap:8px"') + '<h1>Two small meetings</h1><p class="ph-quote">They need no decision from you.</p>' + SMALL_OPTS, '<button class="btn big">Next: Recommended orders <span class="chev">›</span></button>')
write('agenda-h-skip.html', page('Agenda, skip', lap, ph, 'After a skip: status line with the default answer, the cost and Undo; small meetings grouped.'))

# ---------------- everything (expert view) ----------------
col = f'<aside class="col-list" aria-label="This month: all 6"><h2 class="railh" style="font-size:17px">This month: 1 of 6 done</h2>{lrows()}</aside>'
banner = '<div class="banner"><span>You chose Everything last time, so it opens this way from month 4. Nothing moves on by itself.</span><button class="btn small">One at a time instead</button></div>'
lap = hud() + goal(view='all') + f'<main class="full">{col}<section class="item">{banner}{HERO}<p class="ask">What do you say? Choose one of 3 answers, or skip (last card).</p>{XI_OPTS}</section>{rail([("Joint patrol with Japan", "PLA drills close the north channel")], M4_RECS, [], M4_EXEC)}</main>'
ph = phone('2 of 6', 'Phones show one at a time', '<h1>Xi Jinping calls</h1><p class="ask">What do you say? Choose one of 3 answers, or skip (last card).</p>' + XI_OPTS, '<button class="btn big">Next: Takaichi visits <span class="chev">›</span></button>')
write('agenda-h-fulldesk.html', page('Agenda, everything', lap, ph, 'Everything view (Full desk): default from month 4 once chosen; list column, no auto-advance.'))

# ---------------- review ----------------
review = '''<section class="review" aria-label="Check your month">
  <h1>Your month, before you execute</h1>
  <p class="intro">All 6 gone through. This is exactly what will happen.</p>
  <section><h3 class="sec">Decided by you (3)</h3>
    <div class="row"><span class="t">Joint patrol with Japan<small>PLA drills close the north channel</small></span><button class="btn small">Change</button></div>
    <div class="row"><span class="t">Propose a hotline to Xi · ◆ 1<small>Recommended by your Secretary of State</small></span><button class="btn small">Change</button></div>
    <div class="row"><span class="t">Reaffirm the alliance with Japan<small>You meet PM Takaichi</small></span><button class="btn small">Change</button></div></section>
  <section><h3 class="sec">Recommended, accepted (2)</h3>
    <div class="row"><span class="t">Court India · ◆ 1<small>India relations +6, approval +2</small></span><button class="btn small">Change</button></div>
    <div class="row"><span class="t">Your ministers take the 2 small meetings<small>No effect</small></span><button class="btn small">Change</button></div></section>
  <section><h3 class="sec">Skipped (1)</h3>
    <div class="row"><span class="t">Intelligence on China<small>Does not run. ◆ 1 stays</small></span><button class="btn small">Undo</button></div></section>
  <div class="final"><p style="margin:0 0 6px;font-size:17px"><b>If you execute now:</b></p><ul><li>Your 5 decisions happen.</li><li>You spend ◆ 2 of your 3 political capital. ◆ 1 is left, and next month you get 3 more (◆ 4).</li><li>The world moves: 12 other governments act.</li></ul><button class="btn primary big">Execute month 4 <span class="exsub">ends the month</span></button></div>
</section>'''
lap = hud() + goal() + bar(6, 6, '', 6, back=True, review=True) + f'<main>{review}</main>'
ph = f'''<div class="ph-top"><button class="btn small">‹ Back</button><span class="t"><b>Check what will happen</b>6 of 6 gone through</span><button class="btn small">See all</button></div>
<div class="ph-body">{review.replace('class="review"', 'class="review" style="padding:0"')}</div>'''
write('agenda-h-review.html', page('Agenda, check', lap, ph, 'Check what will happen: in words, Execute in the main area.'))

# ---------------- map ----------------
world = '''<svg class="world" viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice" aria-hidden>
  <path d="M520 60 C700 40 900 80 1000 160 C1040 240 980 300 900 330 C860 380 820 420 760 430 C700 400 640 360 600 300 C540 250 480 180 520 60Z" fill="#2c3b2f" stroke="#41543f"/>
  <path d="M1060 200 C1090 230 1100 280 1080 330 C1070 300 1050 250 1060 200Z" fill="#33465a" stroke="#4d6680"/>
  <path d="M930 420 C945 430 950 460 935 480 C925 465 922 440 930 420Z" fill="#3d5a7a" stroke="#6b93bd" stroke-width="2"/>
  <path d="M700 470 C760 500 800 560 780 640 C740 620 700 560 700 470Z" fill="#26332a" stroke="#3a4a3c"/>
  <path d="M880 400 C900 420 905 450 900 470" stroke="#e5383b" stroke-width="3" stroke-dasharray="6 6" fill="none"/>
</svg>'''
MAP_OPTS = '<div class="opts">' + opt('Hold firm: the patrol stays', 'Keeps the Strait open. China -6.') + opt('Propose a hotline · ◆ 1', 'Tension falls a lot. China +5.', rec='your Secretary of State') + opt('Offer a quiet pause', '<span class="bad">Hurts "Japan stays on side".</span>') + skipcard('Skip: your Foreign Minister answers', 'Free, China relations -3.') + '</div>'
mapcard = f'<section class="mapcard"><div class="st">2 of 6 · a call · 🇨🇳 China</div><h3>Xi Jinping calls</h3><p>"Pull the patrol back and we can talk."</p>{MAP_OPTS}</section>'
strip = '''<div class="strip">
  <div class="sgroup"><span class="st">This month</span><button class="btn">☰ Review 3 recommended</button><span class="st">Political capital <b class="num">◆ 3 of 6</b></span></div>
  <span class="grow"></span>
  <div class="sgroup endgrp"><span class="conseq"><b>If you execute now:</b> 1 decision happens, ministers take 4 meetings (China -3, Japan -2), 2 recommended orders do not run.</span><button class="btn primary" style="min-height:56px;font-size:17px">Execute month 4 <span class="exsub">ends the month</span></button></div>
</div>'''
lap = hud(mode='Map') + goal(show_view=False) + f'<div class="map">{world}<span class="pin" style="left:928px;top:438px"></span><span class="maplabel" style="left:950px;top:440px">Taiwan · drills</span><span class="maplabel" style="left:720px;top:220px">China</span><span class="maplabel" style="left:1100px;top:250px">Japan</span>{bar(2, 6, "Xi Jinping calls", 1, "Takaichi visits")}{mapcard}{strip}</div>'
ph = f'''<div class="ph-top"><button class="btn small">Desk</button><span class="t"><b>2 of 6 · Map</b>1 done, 5 to go</span><button class="btn small">See all</button></div>
<div class="ph-map">{world.replace('class="world" ', '')}</div>
<div class="ph-body" style="padding-top:12px"><h1 style="font-size:22px">Xi Jinping calls</h1>{MAP_OPTS}<button class="btn" style="width:100%;justify-content:center;margin-top:14px">☰ Review 3 recommended</button></div>
<div class="ph-bottom"><p>If you execute now: 1 decision happens, ministers take 4 meetings, 2 orders do not run.</p><button class="btn primary big">Execute month 4 <span class="exsub">ends the month</span></button></div>'''
write('agenda-h-map.html', page('Agenda, map', lap, ph, 'Map: Review 3 recommended sits in a "This month" group on the left, Execute alone on the right with its consequences.'))
