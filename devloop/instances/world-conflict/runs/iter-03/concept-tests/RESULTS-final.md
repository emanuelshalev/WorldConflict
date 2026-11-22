# Final replicated icon recognition run: results (D-74)

Scorer: independent (designed nothing). Nine personas, two sheets each (A and B, 28 icons), 504 answers. Answers were mapped to order ids with each sheet's key and judged by meaning against `icon-recognition-test.md`. Calls: "main" counts an answer when it names the order's concept (accepted answers or a clear synonym; "(guess)" counts the same; a hedged list counts when the right concept is among the readings). "Strict" scores every hedged or borderline call against the icon, "lenient" scores every borderline call and the partials in the test file's list for the icon.

## Verdict

**Bar not met.** The pooled number passes (main 87.3%, weighted 87.2%; strict 79.8% misses 80 by 0.2 points), but three parts of the bar fail:

1. Danger orders: Strike nuclear sites 22%, Back a coup 83%, Assassinate leader 89% are all under 90%. (Declare war and Nuclear strike are 100%.)
2. Per-icon floor: Strike nuclear sites 22% and Hard crackdown 44% are under 50% with no exemption (the exemption needs a noisy icon with a history average of 80% or more; crackdown's history average is 44%, Strike nuclear sites is untested). Denounce is 28% but is noisy (gap 3) and has a history average of 85%, so it is exempt by the rule (it should still be looked at, see below).
3. Confusion pairs: Spy / Hunt foreign spies on sheet A is confused by 5 personas (limit 2).

Noise estimate: the average absolute A-B difference per icon is **8.7 points** (about 0.8 persona of 9); mean per-icon A/B gap 1.07 personas. Pooled A 224/252 = 88.9%, B 216/252 = 85.7%. Five icons are noisy (gap 3 or more): Hard crackdown (6), Hunt foreign spies (4), Strike nuclear sites (4), Denounce (3), Feed disinformation (3).

## Pooled recognition

| Reading | Correct /504 | Unweighted | Weighted | Pass (80%) |
|---|---|---|---|---|
| Strict | 402 | 79.8% | 79.7% | no, by 0.2 |
| **Main** | 440 | 87.3% | 87.2% | yes |
| Lenient | 449 | 89.1% | 89.1% | yes |

Per persona correct /56 (main): maya 49, olivia 48, ruth 50, noah 46, priya 47, dan 46, sam 52, leo 54, marcus 48.

## Per order id

A /9, B /9 = correct personas (main call). Mean % = (A + B) / 18. A/B gap = personas right on one sheet and wrong on the other (3 or more = noisy). Weighted % uses panel weights averaged over both sheets. Strict and lenient are counts /18.

| Order id | A /9 | B /9 | Mean % | A/B gap | Weighted % | Strict /18 | Lenient /18 | History avg | Status |
|---|---|---|---|---|---|---|---|---|---|
| `withdraw-border` | 9 | 9 | 100% | 0 | 100% | 18 | 18 | 100% | ok |
| `counter-intel` | 4 | 8 | 67% | 4 | 70% | 11 | 12 | redrawn | noisy, above floor |
| `coup` | 7 | 8 | 83% | 1 | 82% | 10 | 18 | redrawn | danger FAIL (under 90) |
| `court` | 9 | 8 | 94% | 1 | 95% | 14 | 17 | 100% | ok |
| `declare-war` | 9 | 9 | 100% | 0 | 100% | 18 | 18 | 100% | ok, danger pass |
| `airstrike-military` | 9 | 9 | 100% | 0 | 100% | 18 | 18 | 100% | ok |
| `sabotage` | 9 | 9 | 100% | 0 | 100% | 18 | 18 | 100% | ok |
| `reform` | 9 | 9 | 100% | 0 | 100% | 17 | 18 | 100% | ok |
| `denounce` | 4 | 1 | 28% | 3 | 25% | 4 | 6 | 85% | noisy, below floor, exempt by rule |
| `mobilize` | 9 | 9 | 100% | 0 | 100% | 18 | 18 | 100% | ok |
| `airstrike-nuclear` | 3 | 1 | 22% | 4 | 21% | 2 | 5 | redrawn | FAIL floor and danger |
| `destabilize` | 9 | 8 | 94% | 1 | 95% | 16 | 17 | 89% | ok |
| `address` | 8 | 8 | 89% | 0 | 90% | 15 | 17 | 100% | ok |
| `offer-pact` | 9 | 9 | 100% | 0 | 100% | 18 | 18 | 94% | ok |
| `demobilize` | 9 | 9 | 100% | 0 | 100% | 17 | 18 | 96% | ok |
| `fund-nuclear` | 9 | 9 | 100% | 0 | 100% | 16 | 18 | 100% | ok |
| `arm-rebels` | 9 | 9 | 100% | 0 | 100% | 15 | 18 | 67% | ok (strict 83%) |
| `policing-soft` | 7 | 7 | 78% | 2 | 81% | 11 | 15 | 100% | ok, below 80 |
| `break-pact` | 8 | 7 | 83% | 1 | 84% | 12 | 16 | 74% | ok |
| `procure` | 9 | 9 | 100% | 0 | 100% | 18 | 18 | 100% | ok |
| `nuclear-strike` | 9 | 9 | 100% | 0 | 100% | 18 | 18 | 100% | ok, danger pass |
| `disinformation` | 8 | 7 | 83% | 3 | 80% | 11 | 15 | 52% | noisy, recovered (R3 was 0%) |
| `policing-hard` | 7 | 1 | 44% | 6 | 43% | 6 | 8 | 44% | FAIL floor, very noisy |
| `ceasefire` | 9 | 9 | 100% | 0 | 100% | 18 | 18 | 100% | ok |
| `deploy-border` | 9 | 9 | 100% | 0 | 100% | 16 | 18 | 100% | ok |
| `spy` | 7 | 9 | 89% | 2 | 90% | 15 | 16 | 100% | ok, see pair 26/2 |
| `assassinate` | 8 | 8 | 89% | 2 | 87% | 14 | 17 | 100% | danger FAIL by 1.1 points |
| `mediate` | 9 | 9 | 100% | 0 | 100% | 18 | 18 | 100% | ok |

Sheet totals (main): A 224/252 = 88.9%, B 216/252 = 85.7%.

## Pooled mean by A/B (unweighted and weighted, strict and lenient bounds)

| | Strict | Main | Lenient |
|---|---|---|---|
| Unweighted | 79.8% | 87.3% | 89.1% |
| Weighted | 79.7% | 87.2% | 89.1% |

## Danger orders (bar: 90% or more on the A+B mean)

| Order id | A | B | Mean | Strict mean | Result | What it reads as |
|---|---|---|---|---|---|---|
| `coup` | 7/9 | 8/9 | 83% | 56% | FAIL | Mostly "take the throne" (accepted by the key, so scored right). Strict, only 10/18 name a coup or seizing power. Olivia reads "king's throne / king or throne" on both sheets, noah "throne, be king" on A. No tank or invasion reading any more (that failure is fixed). Several answers hedge with "coup" as the second option. |
| `declare-war` | 9/9 | 9/9 | 100% | 100% | pass | |
| `nuclear-strike` | 9/9 | 9/9 | 100% | 100% | pass | |
| `airstrike-nuclear` | 3/9 | 1/9 | 22% | 11% | FAIL | Reads as an assassination or a bomb at a leader (A: leo, marcus; B: sam, leo, marcus, ruth hedged), hard crackdown on protesters (B: priya, sam), coup (B: noah, leo), or "no idea" (maya, olivia on both sheets). The radiation cue is seen by only 3 personas on A and 1 on B. |
| `assassinate` | 8/9 | 8/9 | 89% | 83% | FAIL by 1.1 pt (16/18) | Marcus on A read it as a precision strike on a nuclear site; maya on B "target someone" (partial). The two sheet misses are different personas. |

## Confusion pairs (limit: no more than 2 personas on either sheet)

"Primary" counts personas whose answer to either icon was scored wrong and named the partner's concept. "Any mention" also counts hedged answers that listed the partner as an option while still scoring right.

Sheet A

| Pair (A numbers) | Primary | Any mention | Result |
|---|---|---|---|
| 11/21 airstrike-nuclear, nuclear-strike | 1 (noah "nuke bunker explosion") | 1 | ok |
| 26/2 spy, counter-intel | 5 (ruth, priya, dan, sam, marcus) | 5 | **FAIL**. Counter-intel read as "spy on someone" by ruth, priya, dan, sam, marcus; spy read as "hunt spies" by priya, dan (sam hedged) |
| 3/25 coup, deploy-border | 0 | 0 | ok |
| 3/27 coup, assassinate | 0 | 0 | ok |
| 3/12 coup, destabilize | 0 | 0 | ok |
| 23/18 policing-hard, policing-soft | 2 (priya, marcus) | 3 (adds ruth) | ok on primary, over on any mention |
| 5/24 declare-war, ceasefire | 0 | 0 | ok |
| 28/24 mediate, ceasefire | 0 | 0 | ok |
| 10/15 mobilize, demobilize | 0 | 0 | ok |
| 25/1 deploy-border, withdraw-border | 0 | 0 | ok |
| 14/19 offer-pact, break-pact | 0 | 0 | ok |
| 14/4 offer-pact, court | 0 | 0 | ok |
| 6/11 airstrike-military, airstrike-nuclear | 1 (olivia "bomb something") | 1 | ok |

Sheet B

| Pair (B numbers) | Primary | Any mention | Result |
|---|---|---|---|
| 26/7 airstrike-nuclear, nuclear-strike | 0 | 0 | ok |
| 25/16 spy, counter-intel | 0 | 0 | ok (spy 9/9, counter-intel read as arrest by 8) |
| 14/27 coup, deploy-border | 0 | 0 | ok |
| 14/23 coup, assassinate | 0 | 0 | ok |
| 14/24 coup, destabilize | 0 | 0 | ok |
| 3/13 policing-hard, policing-soft | 1 (dan) | 2 (adds ruth) | ok |
| 10/1 declare-war, ceasefire | 0 | 0 | ok |
| 20/1 mediate, ceasefire | 0 | 0 | ok |
| 28/19 mobilize, demobilize | 0 | 0 | ok |
| 27/18 deploy-border, withdraw-border | 0 | 0 | ok |
| 21/11 offer-pact, break-pact | 0 | 0 | ok |
| 21/12 offer-pact, court | 1 (priya) | 5 (priya, dan, sam, leo, marcus) | ok on primary, over on any mention; every hedger still named the deal first |
| 8/26 airstrike-military, airstrike-nuclear | 0 | 0 | ok |

Unlisted confusions worth a look: airstrike-nuclear read as assassinate (A 2, B 3 to 4 personas), Denounce read as National address (A: maya, ruth, priya, dan, marcus; B: all eight wrong answers are announcement or speech), Hard crackdown read as cleaning or digging (A: ruth, noah; B: maya, olivia, ruth, noah, priya, sam, marcus), Soft policing read as Denounce (B: priya, dan).

## The three final redraws and the watch icons

| Icon | A | B | Mean | Gap | Reading |
|---|---|---|---|---|---|
| `coup` (redrawn) | 7 | 8 | 83% | 1 | Improved from 44%, tank and invasion readings gone. Short of 90 because "throne" or "king" alone is a partial for olivia and noah; "take the throne" is accepted by the key. Stable across sheets. |
| `airstrike-nuclear` (redrawn) | 3 | 1 | 22% | 4 | Not fixed (R3 44%). Reads as a bomb at a leader. Fails floor and danger. |
| `counter-intel` (redrawn) | 4 | 8 | 67% | 4 | Improved from 44%. Handcuffs read well on B (8/9, 7 of them said arrest or catch); on A five personas read "spy on someone". Noisy, above the 50% floor, but pair 26/2 on sheet A fails. |
| `disinformation` (watch) | 8 | 7 | 83% | 3 | Recovered (R1 89, R2 67, R3 0, now 83). Noisy but both sheets are above 50%; the three-round history average is about 61% with this run included. Keep, no redraw. |
| `policing-hard` (watch) | 7 | 1 | 44% | 6 | A 78%, B 11%. Both sheets are not under 50%, so the watch rule (redraw only if both sheets are under 50%) does not trigger on its own, but the mean fails the 50% floor and there is no exemption (history average 44%). Extremely noisy: the cells differ by 6 personas. On B it was read as cleaning or digging by 7 of 9. |

## Noise

| Measure | Value |
|---|---|
| Average absolute A-B difference per icon | 8.7 points (0.79 persona of 9) |
| Mean A/B gap (personas flipping) per icon | 1.07 |
| Icons with gap 0 | 15 of 28 |
| Noisy icons (gap 3 or more) | policing-hard 6, counter-intel 4, airstrike-nuclear 4, denounce 3, disinformation 3 |
| Pooled A vs B | 88.9% vs 85.7% (3.2 points) |

Reading: the drawings that did not change score identically across sheets for 15 icons, so the replicate is mostly stable. The noisy five are all icons already known to be ambiguous.

## Against the full bar

| Bar | Result |
|---|---|
| Pooled 80% or more | Pass on main (87.3%) and lenient (89.1%); strict 79.8% misses by 0.2 |
| Per icon floor 50% | Fail: airstrike-nuclear 22%, policing-hard 44%. Denounce 28% is exempt by rule (noisy, history 85%) |
| Danger orders 90% | Fail: airstrike-nuclear 22%, coup 83%, assassinate 89% |
| Confusion pairs 2 | Fail: spy / counter-intel on sheet A (5) |

Recommended next (scorer's reading, not a design decision): redraw Strike nuclear sites and Hard crackdown; strengthen the coup silhouette so "throne" alone is not the reading; separate Spy from Hunt foreign spies on the handcuff cue; check Denounce against National address (the megaphone is read on only 5 of 18 sheets).
