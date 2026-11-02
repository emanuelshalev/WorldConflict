# Round 3 confirmation: Leo (chaos streamer, 1440×900), 2.0.0-rc.1

Evidence is in `/tmp/claude-0/confirm/leo/`.

## Sessions

1. **Legacy, Iran (UI).** Denounce spam, then Execute spam.
2. **Term, Venezuela (API, then UI).** War on the USA (11 enemies), purge, **deposed by coup in month 11**: F, score 64.
3. **Legacy, Russia (UI).** Nuked Ukraine, then the USA in month 3: **NUCLEAR HOLOCAUST**, score 4.
4. **Term, USA vs China (API).** Impeachment card in month 12, then **deposed by coup in month 38**.
5. **Exploits (API).** Bad values, junk params, forged `alliedWith`, 30 orders, concurrent turns, unknown country. All 10 listed saves then resumed in the UI.

No UI console errors (other than tiles), no 5xx from the UI, and every save loaded.

## Previous P0/P1

| Issue | Status | Evidence |
|---|---|---|
| Free denounce spam | **FIXED** | 30× Denounce USA: one counts (+2), 29 come back "Already ordered this month". Six targets: only the first moves approval, and orders 7–8 are rejected ("At most 6 orders a month"). |
| Negative procure mints GDP and bricks the save | **FIXED** | `value:-500000` and the same on deploy, nuke fund and mobilize are all rejected ("Invalid order value"). GDP is unchanged and the save still loads. |
| GDP collapses while "growing" | **FIXED** | Venezuela $81B → $56B; the HUD read −3.9%, then −10.6%, −22%, −32%. Minor: smoothing lags, so GDP sat flat at $56B for 5 months while showing −27% → −16%. |
| Own catastrophe never leads the news | **FIXED** | "WAR: Venezuela attacks United States", "COUP D'ÉTAT IN VENEZUELA", "☢ Russia USES NUCLEAR WEAPON" and "GLOBAL NUCLEAR HOLOCAUST" all lead. The share text and card quote the coup or holocaust headline (`s2-card.png`). |
| Nukes raise approval; holocaust beats a coup | **FIXED** | Nuking Ukraine: approval −17, legitimacy −10, global embargo. Nuking the USA: approval −9.7. Holocaust scores 4, against 64 and 80 for the coup runs. |
| Rapid clicks skip months | **PARTLY** | 10 quick clicks now resolve 1 month and the Chronicle shows. At 4 clicks/s held for 7 s, 2 months resolve and the first Chronicle closes after about 1 s. The server has no turn guard: 4 concurrent `/turn` calls advance 4 months. |

## New bugs and exploits

| Sev | Bug | Repro |
|---|---|---|
| **P1** | **Ending a big war wipes global tension.** Each ended war gives −8, and the war-count floor only limits decay, so it never lifts tension back up. | Venezuela Term (seed 901), declare war on the USA. When the 11-country war ends (month 6→7), tension drops 65 → **2/100** while Russia–Ukraine, Israel–Iran and Yemen–Saudi are still at war (floor should be 43). |
| P2 | Malformed requests return **500** instead of 400. | `/turn` with `value:"abc"` or `null`, an unknown `type`, or `playerActions:"x"`; `/new-game` with `mode:"BOGUS"`. |
| P2 | `MILITARY_DEPLOY_BORDER` value has no upper bound. | `value:1e12` puts 1,000,000,120,000 troops on Korea's border (manpower 1.28M). Sending `1.7e308` twice overflows to Infinity: the save is protected, but every later deploy to that target returns 500. |
| P2 | Unknown country starts a ghost game. | `/new-game {"playerCountryId":"XXX"}` → 200. The save is listed as "XXX, flashpoint 2026"; it plays with no HUD and turns are accepted. |
| P2 | Preview disagrees with the engine on negative values. | `/preview-action` procure `-5` → "$-5M", "Airpower +-1", affordable: true. Deploy `-5` → "Deploy -5 troops". |
| P2 | Rate limit is 4/s, not the documented 1/s, and it trusts `X-Forwarded-For`. | Five concurrent turns with spoofed IPs: all succeed. |
| P2 | Junk enum params are silently accepted. | Airstrike `targetType:"BOGUS"` → "Carried out". |
| P2 | Coup in the USA contradicts GAMEPLAY ("no coups" where the army isn't political). | Session 4: the impeachment card came in month 12, then legitimacy sat at 0–2 for about 25 months with no removal, followed by *Coup plot uncovered* and "COUP D'ÉTAT IN UNITED STATES". |
| P2 | The holocaust Chronicle still has a **CLOSE CALL** stamp, and my strike is a second item tagged DOMESTIC that says "Carried out". "Your month" reads score −9 while the total falls 82 → 4. | Session 3 (`s3-m3-chron.png`). |
| P2 | A nuclear strike queues on one click with no confirmation. The desk offers "Declare war on", "Offer defense pact to" and "Break pact with" Ukraine while I'm at war with Ukraine. | Russia, month 1 (`s3-01-nuke-ukr-preview.png`). |
| P2 | Nits. | "1 CLOSE CALLS"; save list "month 1" vs HUD "month 2"; end screen backdrop shows "37 MO LEFT · LIVE"; `/health` says `1.0.0`; no second coup card at 0% stability (months 3–10). |

## Scores

| Fun | Clarity | Visual | Realism | Replay | Recommend |
|---|---|---|---|---|---|
| 7 | 7 | 7 | 4 | 6 | 6 |

(Round 3: 7 / 6 / 7 / 3 / 6 / 5)

## Verdict

The exploits that made last round a meme are closed and my disasters finally get the front page, but the server still trusts too much (500s, unbounded deploys, no turn guard), and one ceasefire can still make the world calm.
