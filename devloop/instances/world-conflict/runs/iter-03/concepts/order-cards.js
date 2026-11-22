// Order cards concept renderer (needs order-icons/sprite.js first). Static mock, no game logic.
(function () {
  var A = 'order-cards-assets/';
  var SCENE = {
    court: 'summit-neutral', denounce: 'press-bad', 'offer-pact': 'signing-good', ceasefire: 'ceasefire-neutral', mediate: 'ceasefire-neutral',
    'break-pact': 'press-bad', 'declare-war': 'address-bad', mobilize: 'deployment-neutral', demobilize: 'deployment-neutral', procure: 'war_room-neutral',
    'deploy-border': 'deployment-bad', 'withdraw-border': 'deployment-neutral', 'airstrike-military': 'airstrike-bad', 'airstrike-nuclear': 'airstrike-bad',
    'fund-nuclear': 'nuclear-bad', 'nuclear-strike': 'nuclear-bad', spy: 'covert-neutral', 'counter-intel': 'covert-neutral', sabotage: 'covert-neutral',
    destabilize: 'streets-neutral', 'arm-rebels': 'streets-bad', disinformation: 'covert-neutral', assassinate: 'covert-neutral', coup: 'parliament-neutral',
    reform: 'exec_order-good', address: 'address-good', 'policing-soft': 'streets-neutral', 'policing-hard': 'streets-bad',
  };
  function meta(id) { return (window.ORDER_ICONS || []).find(function (m) { return m.id === id; }) || { family: 'home', label: id }; }
  function fam(id) { return window.ORDER_FAMILIES[meta(id).family]; }
  function icon(id) { return '<svg viewBox="0 0 48 48" aria-hidden="true"><use href="#oi-' + id + '"/></svg>'; }
  function plate(id, extra) { return '<span class="plate">' + icon(id) + (extra || '') + '</span>'; }
  function chip(id) { return '<span class="chipf"><i></i>' + fam(id).name + '</span>'; }
  function seals(n, missing) {
    if (!n) return '<span class="cost">free</span>';
    var s = '';
    for (var i = 0; i < n - (missing || 0); i++) s += '<span class="seal"></span>';
    for (var j = 0; j < (missing || 0); j++) s += '<span class="seal hole"></span>';
    return '<span class="cost" aria-label="Costs ' + n + ' political capital">' + s + '</span>';
  }
  /**
   * o: { id, title, desc, cost, missing, chance, def, noundo, state, reason, fix, alt, staff, staffRole,
   *      compact, band: 'scene' | 'fam', hover }
   */
  window.orderCard = function (o) {
    var f = 'f-' + meta(o.id).family;
    var st = o.state || 'available';
    if (st === 'confirming') {
      return '<article class="oc ' + f + ' st-confirming" data-state="confirming"><div class="cf">' + plate(o.id) + '<div><span class="chipf" style="--chip:#4a1a1c;--ink:#ffc2c2;--a:#ff6b6d"><i></i>No undo</span><div class="q">' + o.question + '</div></div></div>' +
        '<ul>' + (o.lines || []).map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>' +
        '<div class="acts"><span class="btn hold">' + (o.confirm || 'Declare war') + '</span><span class="btn">' + (o.cancel || 'Keep the peace') + '</span></div></article>';
    }
    var band = o.band === 'fam' || o.compact
      ? '<div class="band fam"><span class="wm">' + icon(o.id) + '</span>' + (o.compact ? '<span class="bchip">' + chip(o.id) + '</span>' : '') + seals(o.cost, o.missing) + '</div>'
      : '<div class="band"><img alt="" src="' + A + 'scene-' + SCENE[o.id] + '.jpg">' + seals(o.cost, o.missing) + '</div>';
    var chips = [];
    if (o.noundo) chips.push('<span class="c noundo">No undo</span>');
    if (o.def) chips.push('<span class="c" style="color:#9ad8f0;border-color:rgba(79,179,217,.5)">' + o.def + '% defense</span>');
    if (o.chance != null && st !== 'invalid') chips.push('<span class="c">' + o.chance + '% chance</span>');
    var bottom = '';
    if (st === 'available') bottom = o.compact ? '<div class="foot"><span class="add">+ Add</span></div>' : '<div class="foot"><span class="add">+ Add to this month</span><span class="fc">Forecast</span></div>';
    if (st === 'queued' && o.compact) bottom = '<div class="foot"><span style="color:#7fdcb2">&#10003; Added</span><span class="fc">Remove</span></div>';
    if (st === 'unaffordable') bottom = '<div class="reason"><span>&#128274; <b>' + o.reason + '</b></span>' + (o.fix ? '<span class="fix">' + o.fix + '</span>' : '') + '</div>';
    if (st === 'invalid') bottom = '<div class="reason"><span>&#9432; <b>' + o.reason + '</b></span>' + (o.alt ? '<span class="fix alt">' + o.alt + '</span>' : '') + '</div>';
    if (st === 'queued' && !o.compact) bottom = '<div class="foot"><span style="color:#7fdcb2">&#10003; In this month</span><span class="btn">Remove</span></div>';
    if (st === 'proposed') bottom = '<div class="reason" style="border-color:rgba(242,169,59,.25)"><span class="staff"><span class="av">' + (o.staffInit || 'FM') + '</span>Proposed by the ' + (o.staff || 'Foreign Minister') + '</span>' + (o.fx ? '<span style="color:var(--text-2)">Will change: ' + o.fx + '</span>' : '') + '<span style="display:flex;gap:8px"><span class="btn pri">&#10003; Approve order</span><span class="btn">Remove</span></span></div>';
    var desc = st === 'available' && !o.compact && o.desc ? '<p class="desc">' + o.desc + '</p>' : '';
    var ck = st === 'queued' ? '<span class="chk">&#10003;</span>' : '';
    return '<article class="oc ' + f + ' st-' + st + (o.compact ? ' compact' : '') + (o.hover ? ' hover' : '') + '" data-state="' + st + '" data-order-id="' + o.id + '">' + band +
      (st === 'queued' ? '<span class="stamp">ORDERED</span>' : '') +
      '<div class="head">' + plate(o.id, ck) + chip(o.id) + '</div>' +
      '<div class="body"><h3 class="title">' + o.title + '</h3>' + desc + (chips.length ? '<div class="chips">' + chips.join('') + '</div>' : '') + bottom + '</div></article>';
  };
  /** Row: { id, title, meta, why, state, act, thumb, staff, staffInit } */
  window.orderRow = function (o) {
    var f = 'f-' + meta(o.id).family;
    var st = o.state || 'available';
    var lead = o.thumb ? '<span class="thumb"><img alt="" src="' + A + 'scene-' + SCENE[o.id] + '.jpg">' + plate(o.id) + '</span>' : plate(o.id, st === 'queued' ? '<span class="chk">&#10003;</span>' : '');
    var acts = o.act || (st === 'available' ? '<span class="btn">+ Add</span>' : st === 'queued' ? '<span class="btn">Remove</span>' : st === 'proposed' ? '<span class="btn pri">Approve</span>' : '<span class="btn">Why</span>');
    return '<div class="or ' + f + ' st-' + st + '" data-state="' + st + '" data-order-id="' + o.id + '">' + lead +
      '<div><p class="t">' + o.title + '</p><div class="m">' + chip(o.id) + (o.meta ? '<span>' + o.meta + '</span>' : '') + '</div>' +
      (o.staff ? '<div class="m" style="margin-top:5px"><span class="staff"><span class="av">' + (o.staffInit || 'FM') + '</span>' + o.staff + '</span></div>' : '') +
      (o.why ? '<div class="why' + (st === 'invalid' ? ' rule' : '') + '">' + o.why + '</div>' : '') + '</div><div class="act">' + acts + '</div></div>';
  };
})();
