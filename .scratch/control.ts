import { FLASHPOINT_CONTROL, playControl } from "../tests/fixtures/control.js";

for (const p of ["staff", "guided", "callpush", "callhold", "chief"] as const) {
  let wins = 0;
  let capped = 0;
  let months = 0;
  let callMonths = 0;
  let late = 0;
  let maxCalls = 0;
  let real = 0;
  let realMonths = 0;
  const won: string[] = [];
  for (const code of FLASHPOINT_CONTROL) {
    const g = playControl(code, p);
    if (g.final.outcome?.victory) {
      wins++;
      won.push(code);
    }
    for (const m of g.months) {
      months++;
      if (m.after.politicalCapital >= 6) capped++;
      if (m.before.turn >= 1) {
        late++;
        if (m.advice.calls.length) callMonths++;
      }
      maxCalls = Math.max(maxCalls, m.advice.calls.length);
      if (m.before.turn >= 1) { const r = m.advice.calls.filter((c) => c.trade).length; real += r; if (r) realMonths++; }
    }
  }
  console.log(p, `wins ${wins}/${FLASHPOINT_CONTROL.length}`, won.join(","), `capped ${capped}/${months}`, `call months 2-12 ${callMonths}/${late}`, `max calls ${maxCalls}`, `real/month ${(real / late).toFixed(2)} months with one ${realMonths}/${late}`);
}
