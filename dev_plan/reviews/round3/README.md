# Round 3: reviews, playtests and triage

Five independent reviewers ran in parallel on the build at `5cdbe8e`:
- four personas drove the real UI with Playwright (Maya on a 390×844 phone; Dan, Priya and Leo at 1440×900);
- a UX/visual expert covered every screen at 1440, 1024 and 390;
- an independent code review covered the round-3 diff.

Reports are in this folder: `maya.md`, `dan.md`, `priya.md`, `leo.md`, `ux.md`.

## Scores (1–10)

| | Fun | Clarity | Visual | Realism | Replay | Recommend |
|---|---|---|---|---|---|---|
| Maya | 7 | 6 | 7 | 5 | 7 | 6 |
| Dan | 5 | 7 | 7 | 4 | 4 | 5 |
| Priya | 7 | 6 | 8 | 5 | 6 | 6 |
| Leo | 7 | 6 | 7 | 3 | 6 | 5 |

UX expert: visual polish 7, usability 6, accessibility 3.

## Triage: what was fixed

**P0**
| Finding | Who | Fix |
|---|---|---|
| Unlimited free Denounce within a month (+35 approval in one month) | Leo | Only the first denunciation each month moves voters; duplicate orders rejected; at most 6 orders a month (`turn.ts`) |
| Negative "Buy weapons" value minted GDP and bricked the save | Leo | Purchase value validated; the world state is schema-checked before every save (`turn.ts`, `infra/db.ts`) |
| Escape closed nothing; modals didn't trap focus | UX | Global Escape handler (`App.tsx`); `useModalFocus` focus management with `aria-modal` on every dialog |
| About 25 AI defence pacts per run; four pacts with Ukraine in month 1 | Priya | Pacts are rare (×0.35), never with a country at war, capped at 4, none with Taiwan (`diplomacy.ts`) |
| Macron re-elected | Priya | Term limits for USA, FRA, MEX, KOR, PHL, BRA (`government.ts`) |

**P1**
| Finding | Who | Fix |
|---|---|---|
| "Address + reform" loop self-funding at >70% approval | Dan | Capital is a flat 2◆ (3 in Flashpoints, +1 on Story), no popularity bonus |
| AI signed the player into pacts | Dan | Offers land on the desk as a `pact_offer` crisis card |
| Previews ignored diminishing returns | Dan | Address and reform previews compute the engine's decay and headroom |
| Collapse had no consequence (0 legitimacy for months) | Dan | Impeachment/no-confidence for every democracy; shields fail below 10 legitimacy and risk rises |
| HUD showed growth while GDP collapsed | Maya, Leo, Priya | HUD, voters and the economic score read **real growth** (actual GDP change, smoothed); war damage scaled by geography and by the enemy's economic reach |
| Small allies stayed at war after the principal's ceasefire | Maya | Wars record `alliedWith`; co-belligerents go home when the principal's war ends |
| "Ally buckling" card while the ally was winning | Maya | Card only fires when the ally's front is under 45 |
| Player's own coup, impeachment, war or nuke never led the paper | Leo | Player catastrophes own the front page; proper impeachment and no-confidence headlines |
| Nukes raised approval; holocaust outscored a coup | Leo | Nuclear use costs −15/−25 approval and −10/−20 legitimacy; a holocaust zeroes the score |
| Rapid clicks skipped a month | Leo | Execute ignores clicks for 0.9 s after a new month |
| Map popup unreadable; small text below AA | UX | Popup scoped above maplibre's CSS; `--text-3` and small red text raised to AA |
| HUD overlaps at 1024 and 390 | UX | Short labels below 1200px; growth hidden in narrow phone columns |
| Advisor suggested "Mediate peace for United States" | UX | Never suggests targeting yourself |
| Two order vocabularies; preview with "$0M" and no ◆ | UX | One vocabulary (`ui/src/lib/actions.ts`); preview rebuilt on design-system classes, shows ◆, and a backdrop click keeps the order |
| Score-only failures were opaque | UX, Priya | The mission chip shows the live score next to score goals; options that hurt a mission goal get a "⚠ mission" badge |
| Share card: localhost, empty space, self-headline | UX, Maya | Public URL, legends, leader line, the latest world headline that isn't the player's own order |
| Mobile title bar covered the daily; phone dossier unusable | UX, Maya | Static launch bar on phones; dossier is a bottom sheet |
| Ukraine scripts ignored the ceasefire | Priya | Scripted crises can declare `requiresWar` and are skipped once that war ends |
| Sudan coup every run, fantasy revolutions | Priya | AI coup/revolution odds ×0.35 |
| Summit lifted the North Korea embargo yearly | Priya | Nuclear-armed pariahs need average relations above +10 |
| "King" MBS, "SALMAN'S"/"CHING-TE'S" headlines, "President of Philippines" | Priya, Maya | Leader's own title; full names in headlines; `withArticle()` |
| US–Israel listed as a treaty alliance | Priya | Removed from the 2026 scenario (no mutual-defence treaty exists) |
| Israel–Iran reported as ground "sweeping gains" | Priya | Air-and-sea vocabulary for wars without a land border |
| Intel estimates above 100% | Priya | Percentage ranges capped at 100 |
| "2 crisises", "2 crisis unanswered", React duplicate key | Maya, UX | Fixed |

**Release code review:** five confirmed bugs, all fixed:
- a forged `alliedWith` on a war order now has to name a real principal at war with the target;
- term limits use real term rules (2026 incumbents, then 2 terms for the USA, France and Brazil, 1 for Mexico, Korea and the Philippines) instead of applying forever;
- the alliance preview now uses the engine's `allianceOdds`;
- Escape drops a blocked order;
- the share text skips every decision headline.

Also fixed: the UI enforces the one-per-target and 6-order limits, negative order values are rejected, the pact card names the real proposer, and old saves seed real growth.

**Code review (minor):** share-card grid cap, multi-word surnames, legacy-save war count and harness spy-hunt timing were all fixed. The denounce-preview fix was superseded by the once-a-month rule.

## Not fixed (logged as P2 in HANDOFF)

- The defence budget order barely matters (Dan).
- Courting at extreme lows barely moves relations; prestige decays steadily (Dan, Maya).
- Tab order: no skip link, Execute comes late (UX).
- Small number mismatches: save list "month 0" vs HUD "month 1" (UX).
- Odd coup-card arrows; Israelis fleeing to Egypt in a refugee card (Maya).
- Russia striking Turkey's young programme provokes no reaction (Priya).
