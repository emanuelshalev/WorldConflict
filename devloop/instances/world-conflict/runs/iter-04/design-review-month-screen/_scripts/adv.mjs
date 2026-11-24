import { newSave, API, SEATS } from './lib.mjs';
for (let i = 0; i < 3; i++) {
  const s = await newSave(SEATS.hc, 3);
  const l = await (await fetch(`${API}/load/${s.save}`)).json();
  const a = l.advice ?? {};
  console.log(JSON.stringify(Object.keys(a)), JSON.stringify((a.proposals ?? a.orders ?? []).map?.((p) => p.type + ':' + (p.targetCountryId ?? ''))), l.worldState?.politicalCapital);
}
