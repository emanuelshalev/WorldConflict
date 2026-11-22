# QA reproduction, iteration 0 (build b271008)

QA Engineer, 2026-11-21. Driver on port 7820. Screenshots: `runs/iter-00/shots/qa/` (laptop 1440x900) and `shots/qa/phone/` (390x844). Probe scripts and CPU profiles are in the QA scratchpad (`perf.mjs`, `bisect.mjs`, `canv.mjs`, `mapfreeze.mjs`).

**Two harness facts explain several reports.** Fix these in the kit before iteration 1.
- **The kit cannot click some controls by label.** `kit.mjs` `click()` uses `getByRole('button')`, so it never matches controls that declare another role. Affected: the debrief tabs and the Map/Desk switch (`role="tab"`), and the desk Navigator rows, which include Mission and All orders (`role="option"`). `look` still lists these controls, so personas tried them, saw "nothing happen", and reported dead controls. A real tap at the same spot works on both laptop and phone.
- **Native `confirm()` dialogs are dismissed silently.** Playwright auto-dismisses `confirm()` when no handler is set. Mission-warning orders and the nuclear strike therefore fail to queue with no message under the driver.
- **Rendering is software only by default.** Headless Chromium falls back to SwiftShader (software GL). The machine has a GPU (NVIDIA GB10). I re-ran with `--use-gl=angle --use-angle=vulkan --enable-gpu --ignore-gpu-blocklist`, in a scratch copy of the kit. No source was changed.

## Summary table

| # | Report | Verdict | Sev | Root cause |
|---|---|---|---|---|
| 1 | Freezes (Execute, debrief, Map) | ENVIRONMENT, made much worse by the game itself. With software GL it reproduces every time; with a GPU it does not | S2 | The hidden MapLibre map keeps drawing behind the desk at full rate under software GL; 97 endless CSS animations run on the desk |
| 2 | Leo: war will not queue, toast stays | REPRODUCED (partly the harness) | S3 | The second attempt hits the mission-warning `confirm()` (auto-dismissed). The toast never auto-clears: `gameStore.ts:1110`, `App.tsx:141-152` |
| 3 | Dan: Enter queues "nuclear strike" with no confirmation | REPRODUCED (it is the nuclear-site airstrike, not the nuke) | S2 | `Detail.tsx:285-287`: Enter adds the first hit. For "nuclear strike india" the first hit is "Strike nuclear sites in India" (an act of war, no confirmation) |
| 4 | Dimmed orders give no reason | REPRODUCED | S2 | `Detail.tsx:317-319`: disabled only because no target is picked, no reason shown. `MapActionMenu.tsx:201-202`: reason only in the native `title` |
| 5 | Capital: HUD vs rail; toast vs meter | REPRODUCED (HUD vs rail); NOT A BUG (Leo's toast) | S3 | `Hud.tsx:121-124` fills the pips you have left; `CommandRail.tsx:36` fills the pips you have spent |
| 6 | Debrief contradictions | REPRODUCED (check vs failed order, card vs tile); ENVIRONMENT ("51.1 to 51.1 +6") | S3 | `lib/debrief.ts:113-147`; count-up `debriefParts.tsx:10-24` + `useCountUp.ts` |
| 7 | "Your call" after Approve staff pick | REPRODUCED (wording only, the pick is kept) | S3 | `desk/Navigator.tsx:64`, `desk/Detail.tsx:133` |
| 8a | "Salman on After the Riyadh airport strike" / "On after the..." | REPRODUCED | S2 | `src/core/reactions.ts:361`, `src/core/turn.ts:1634` |
| 8b | "The front moves l" | NOT A BUG in the text (it renders "1"; in the serif headline font the 1 looks like an l) | S4 | `lib/debrief.ts:209` (no unit word) |
| 8c | Same reply "Words like these travel fast" from different leaders | REPRODUCED (by code) | S3 | `reactions.ts:27,56-61,334-345`: 4 warm lines, 3 warm headline verbs, no check against repeats within a month |
| 8d | Title says Hormuz, the default pick is Bab al-Mandab | REPRODUCED | S3 | `TitleScreen.tsx:107` selects `flashpoints[0]`, not `daily.flashpointId` |
| 9 | Mission chip / debrief tabs do nothing | NOT REPRODUCED (harness: role tab/option) | - | Works with a real tap on laptop and phone |
| 10 | Same crisis repeats; Home and security page always the same | REPRODUCED (enemy call every month); PARTLY (Home page) | S3 | `src/core/meetings.ts:49-58`: at war, the enemy's score always wins despite the "3 month" rule |

## Notes per item

**1. Freezes.**

Steps: Flashpoint, Saudi Arabia, Take office, then go to the desk. From there, either switch to Map, or Execute and go on to the month 2 desk.

Expected: the game stays responsive.

Actual with software GL (what the panel had):

| Screen | GPU process CPU | Main thread busy |
|---|---|---|
| Title, idle | 724% | 97% (globe at 9 to 12 fps) |
| Desk, idle | 750 to 960% | about 50% |
| Debrief | about 950% | not measured |

- Clicking Map blocks the main thread for **15.6 s**. Almost all of it is native time (`program`), with "GPU stall due to ReadPixels" warnings.
- The month 2 desk froze the driver for **about 4 minutes**. Screenshots timed out, and the GPU process sat at 1600% (16 cores) with 3.4 GB of memory.
- Even with every region hidden and reduced motion turned on, the GPU process stays at about 900% and navigating to about:blank times out. It is working through a backlog.
- An instrumented `getContext` shows the cause: the MapLibre canvas under the desk issues about **33,800 draw calls/s** (60 clears/s). The map is still mounted, hidden only with `visibility:hidden` (`App.tsx:200`, `wc.css:2278`).
- The animation loop in `MapView.tsx:704-707` returns early in desk mode, but MapLibre's own render loop does not stop.

With a GPU:

| Screen | Renderer CPU | GPU process CPU | Main thread busy | Map draw calls |
|---|---|---|---|---|
| Desk, idle | 28 to 56% | 17% | about 20% | 0/s |
| Map | about 48% | about 22% | about 33% | |

- Switching to Map takes under 200 ms.
- I played 12 Term months (Pakistan) and 2 Flashpoint months with no freeze.

Still heavy at idle:
- **97 infinite CSS animations** on the desk and debrief. 63 of them are map markers (`wcm-*`) animating behind the hidden map. `wcm-glow` animates `box-shadow`, which repaints every frame.
- About **240 layouts/s** at idle.

Verdict for players: a laptop with a working GPU will not freeze, but its fan will spin. A browser with hardware acceleration off, a VM or remote desktop, or a blocklisted GPU gets exactly the panel's freezes. Recommendations:
- Pause MapLibre and the markers while the desk covers the map (`map.stop`, or detach markers), or unmount it.
- Stop off-screen marker animations.
- Add software-GL detection that falls back to the static map.

**2. Leo (Water War, Pakistan).**

Steps:
1. All orders, type "declare war on india", press Enter with 1 capital left. Toast: `Not enough political capital for "Declare war on India" (2 needed)` (shot 027).
2. Remove both staff Court orders (3 left) and press Enter again. Nothing is queued, and the old toast is still on screen (029-w3).
3. Dismiss the toast and press Enter again. Still nothing queued, and no message (031-w5).

The API preview gives `missionWarning: "This ends your mission: War with India fails..."`, so `queueOrder` (`gameStore.ts:1117`) calls `window.confirm`, which the driver dismisses. A real player would see the browser dialog.

Real defects:
- The toast never times out and is not cleared by the next attempt.
- The mission veto is a native `confirm()` rather than in-game UI.

The "2 needed while the meter says 1 left" is consistent (1 < 2), not a bug.

**3. Dan.**

Searching "nuclear strike india" gives "Strike nuclear sites in India" as the first hit, with the Enter hint, and the real "☢ Nuclear strike India" second. Enter queues the conventional airstrike on nuclear sites at once (Dan shot 015). The real nuclear strike does have a `confirm()` (`gameStore.ts:1097-1104`) and is blocked outside wartime.

Fix:
- Require confirmation for `danger` orders added from search.
- Rank exact-name matches first.
- Also, "nuke" finds nothing because the label starts with "☢".

**4.** In All orders, every targeted order is dimmed until a target is chosen in the dropdown. Hover and click give no feedback (024-hovwar), and the only hint is the trailing "…".

**5.**
- Pakistan month 1: HUD shows 1 of 3 pips filled ("◆ 1 left") while the rail shows 2 of 3 pips filled ("1 left of 3") (021-orders2).
- Saudi month 2: HUD 3 of 4 filled, rail 1 of 4 filled.
- Dan shot 015: HUD empty, rail full.

**6.**
- **Grouped country card.** A grouped country card takes its headline and reply from the call. Its check mark comes from the change in relations, while the failed order is only a red sub-line (`debrief.ts:128-147`, Sam 012-d3b).
- **Approval -6 on the card vs -8.5 on the tile.** The card shows only the crisis effect; the tile shows the whole month (004-exec1). Both are correct, but neither label says so.
- **Values mid-count.** The "after" numbers count up over about 1 s by rAF. On a starved machine, screenshots catch "51.1 to 51.1 +6", and on the phone even "58.1" next to a final "-6" (phone/003). Consider showing the final value at once when frames are slow, or rounding to the precision of the chip.
- **Extra: tension does not match.** The debrief tile says world tension 74.2 (-5.0), the card says 76 to 71.6, and the paper says "Global tension 71/100" (010-paper1). Root cause not traced.

**7.** After Approve staff pick:
- The badge reads "Your call".
- The rail says "Sanctions on Iran: Abstain" and "Crisis decided", and Approve drops from 4 to 3 (018-approved).

The pick is kept. "Your call" reads like "still up to you". Suggest "Decided".

**8a.** The newspaper headline and lede come out as "Salman on After the Riyadh airport strike: Back channel via Muscat" and "On after the Riyadh airport strike, ...". The lede starts with a drop-cap "O" (010-paper1). The fighter-jet art is also shown for a back-channel choice. Crisis titles are not always noun phrases, and these templates assume they are.

**8c.** The line is picked as `seed % 4` from a seed hashed per meeting and option. Two warm calls in one month repeat a line about 25% of the time, and a headline verb about 33% of the time. "Noted and filed..." is the only neutral staff line (`reactions.ts:113`).

**10.** Autoplay of a Term (Pakistan, Approve all + Execute, months 1 to 12):
- Supreme Leader Akhundzada (the war enemy) was a suggested call **every month from 1 to 9**, until the war ended.
- In the same debrief, the staff text says he "may not call again for three months".
- With `war`, the recency penalty is only -60 against +100 war and about +60 from relations.

Home and security in my run varied month to month. What repeats is the staff re-queueing Reform program, Soft policing and Mobilize, which then reappear as cards (Priya's case).

## Other

- **Escape on the Chronicle.** Escape does not close the Chronicle when it is opened after the debrief; only "To your desk" at the bottom does. Seen in the Term run, root cause not traced, S4.
- **Phone.** I saw no freeze and no broken tap with a GPU.
