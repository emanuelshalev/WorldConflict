# World Conflict: Geopolitical Accuracy Review and 2026 Archive

**Author:** realism and accuracy consultant (IR / diplomatic history)
**As of:** 2026-11-01
**Scope:** an audit of the 25 country profiles and the 3 scenarios; a briefing on the state of the world in November 2026; current leaders; 16 proposed new countries (profiles in `dev_plan/reviews/geo-data/`); a spec for a 2026 scenario; 8 short "flashpoint" scenarios.

**Method.** Facts after mid-2025 were checked by web search in Oct–Nov 2026. Sources are cited inline as URLs.

How sources are marked:
- **[bk]**: background knowledge from widely reported 2024–25 events, linked to a reference page but not re-fetched for this review.
- **(U)**: uncertain. The item comes from a single source, is contested, or is moving fast. Re-verify before shipping.

Wikipedia "2026 in X" pages and the 2026 Iran war article were the main aggregators, cross-checked against wire stories.

> **Caveat:** three things were still unsettled on 2026-11-01: the composition of the next Israeli government (results certified 2026-11-04), the outcome of the 2026-11-03 US midterms, and the Iran war. The 2026 scenario below is frozen at **1 November 2026**.

---

## Contents

- A. Accuracy audit of the existing data
- B. State of the world, November 2026 (the archive)
- C. Current leaders, 1 November 2026
- D. Proposed new countries (16)
- E. "2026" scenario spec
- F. Flashpoint scenarios (8)
- G. Engine and schema gaps found during the review

---

## A. Accuracy audit of existing data

### A.1 Systemic issues (fix these first)

1. **`2025.json` has no wars.**
   - In January 2025 the following were live: Russia–Ukraine, Israel–Hamas (the 19 Jan 2025 truce came later), Sudan, the Houthi–Red Sea campaign and Myanmar.
   - None of the belligerents except Russia and Israel exist in the roster, so these wars cannot be expressed.
   - Fix: add UKR, PSX, SDN and YEM (section D), then add `startingWars`, at minimum `{RUS→UKR, frontline 58}` and `{ISR→PSX, 70}`.
2. **Key events stop in 2014–2021 for most countries.**
   - 22 of 25 profiles have no key event after 2022, and CAN's last event is from 1994.
   - The AI's "memory" therefore misses the defining shocks of the period: the 2024 Korean martial law, the 2025 India–Pakistan war, the 2025 and 2026 Iran wars, the 2025 tariff war, the 2026 Venezuela raid, etc.
   - Per-file additions are in A.3.
3. **Arms suppliers cannot express China.**
   - `SupplierIdSchema` is `USA|GBR|FRA|RUS|PRIVATE`.
   - China supplies about 80% of Pakistan's major arms imports (SIPRI) and is a major supplier to the new ETH, VEN, SDN and ARE profiles. Pakistan's real J-10C and HQ-9 dependence is invisible, as is Russian–Chinese supply to Iran.
   - Recommendation: add `CHN` (and possibly `TUR` for drones, and `ISR`) as suppliers.
4. **Sphere-of-influence and rival lists are partly anachronistic.**
   - `USA.sphereOfInfluence` lists treaty allies (GBR, JPN, AUS…), which are not a sphere.
   - `CHN.sphereOfInfluence` includes IDN. Indonesia is firmly non-aligned and clashes with China over the Natuna EEZ.
   - `RUS.sphereOfInfluence = [IRN, PRK]` should be `[BLR, UKR]` (plus the Caucasus and Central Asia if added).
   - `FRA.historicalRivals` includes DEU and GBR, and `POL.historicalRivals` includes DEU. With the AI weighting rivals, this produces implausible intra-NATO hostility in modern scenarios. Make rivals era-specific (scenario overrides) or drop them.
5. **The `2025.json` alliance list treats USA–ISR as a treaty alliance.** No mutual-defence treaty exists. Keep it if the engine needs it for co-belligerence, but label it "de facto". Missing pacts:
   - the Russia–Belarus Union State (needs BLR);
   - the 2025-09-17 Saudi–Pakistan Strategic Mutual Defense Agreement (only for scenarios starting after Sep 2025);
   - USA–PHL (needs PHL).
6. **Nuclear warhead counts are dated.** SIPRI Yearbook 2025 inventories (Jan 2025), with 2026 where reported (https://www.sipri.org/media/press-release/2026/increasing-focus-nuclear-weapons-amid-heightened-escalation-risks-new-sipri-yearbook-out-now):

   | Country | Current | Should be | Note |
   |---|---|---|---|
   | USA | 5,044 | 5,177 | SIPRI 2025 |
   | RUS | 5,580 | 5,459 | SIPRI 2025 |
   | CHN | 500 | 600 (2025) / about 620 (2026) | |
   | IND | 172 | 180 (2025) / 190 (2026) | first deployed warheads reported in 2026 (https://www.theweek.in/news/defence/2026/06/09/india-expands-nuclear-arsenal-to-190-warheads-deploys-some-for-first-time-sipri.html) |
   | PRK | 50 | 50 | about 60 in some 2026 reporting (U) |
   | GBR | 225 | 225 | OK |
   | FRA | 290 | 290 | OK |
   | PAK | 170 | 170 | OK |
   | ISR | 90 | 90 | OK |

7. **GDP is mostly 2023 data.** IMF WEO (Oct 2025 vintage) nominal estimates for 2026, in USD billions. Source: https://en.wikipedia.org/wiki/List_of_countries_by_GDP_(nominal), citing IMF. Verify against the WEO database before import.

   | ID | In file | 2026 IMF | ID | In file | 2026 IMF |
   |---|---|---|---|---|---|
   | USA | 27,360 | 32,642 | KOR | 1,710 | 2,246 |
   | CHN | 18,530 | 21,546 | MEX | 1,800 | 2,176 |
   | DEU | 4,430 | 5,471 | AUS | 1,700 | 2,111 |
   | JPN | 4,230 | 4,342 | TUR | 1,150 | 1,818 |
   | GBR | 3,340 | 4,268 | IDN | 1,400 | 1,480 |
   | IND | 3,940 | 4,060 | SAU | 1,110 | 1,343 |
   | FRA | 3,050 | 3,554 | POL | 845 | 1,133 |
   | RUS | 2,240 | 2,861 | ISR | 520 | 747 |
   | ITA | 2,250 | 2,702 | ZAF | 380 | 489 |
   | BRA | 2,200 | 2,655 | PAK | 340 | 450 |
   | CAN | 2,140 | 2,490 | EGY | 390 | 443 |
   | NGA | 390 | 334–387 (post-rebasing; see A.3) | IRN | 400 | 312 (war-hit; 300–350) |

   The April 2026 WEO was written before the July 2026 collapse of the Iran ceasefire. The October 2026 WEO puts world growth at 3.1% for 2026 (https://www.australianindustrygroup.com.au/resourcecentre/research-economics/economics-intelligence/2026/global-forecasts-october-2026/).

   Recommendation: keep the profiles at "2025 actual" values and let scenarios override them.

### A.2 `data/scenarios/2025.json` (scenario start 2025-01)

The leaders are almost all correct for **January 2025** but obsolete for any later start.

| Field | Current | Correct for 2025-01 | Note |
|---|---|---|---|
| `leaders.KOR` | Yoon Suk-yeol, HAWKISH | **Choi Sang-mok, Acting President** (PRAGMATIC, APPOINTED, since 2024-12) | Yoon was impeached and suspended on 2024-12-14 after the 2024-12-03 martial law. Lee Jae-myung took office 2025-06-04. Yoon was sentenced to life for insurrection on 2026-02-19 (https://www.aljazeera.com/video/newsfeed/2026/2/19/south-koreas-ex-president-yoon-gets-life-for-insurrection). |
| `leaders.USA` | Trump | Biden until 2025-01-20 | Acceptable if the scenario is read as "post-inauguration". Rename the description to "January 2025 (post-inauguration)". |
| `leaders.DEU` | Scholz, DOVISH | OK for Jan 2025 | Merz from 2025-05-06. Scholz is better as PRAGMATIC than DOVISH: he presided over the *Zeitenwende*. |
| `leaders.CAN` | Trudeau | OK for Jan 2025 | Carney from 2025-03-14. |
| `leaders.JPN` | Ishiba | OK for Jan 2025 | Takaichi from 2025-10-21. |
| `leaders.BRA.style` | DOVISH | PRAGMATIC | Lula's foreign policy is non-aligned and transactional rather than dovish. |
| `leaders.SAU.title` | Crown Prince | "Crown Prince and Prime Minister" | MBS has been PM since 2022-09. |
| `startingWars` | `[]` | see A.1(1) | |
| `alliances` | `["USA","ISR"]` | label de facto | see A.1(5) |
| `initialRelations.USA.ZAF/BRA/MEX/CAN` | 35 / 40 / 60 / 90 | fine for Jan 2025 | For 2026 they collapse: ZAF about 5, BRA about 10, MEX about 40, CAN about 30 (section E). |
| `countryOverrides.IRN.nuclearProgress` | 65 | 65 is defensible for Jan 2025 | IAEA: about 275 kg of 60% HEU in Feb 2025, about 440 kg by Jun 2025 [bk] |

### A.3 Per-profile findings (`data/countries/*.json`)

| File | Field | Current → suggested | Source / note |
|---|---|---|---|
| USA | `population` | 335M → 342M | US Census 2025 estimate [bk] |
| USA | `keyEvents` | ends 2021 | Add: 2025 "Liberation Day" tariffs (2025-04-02) [bk]; 2026-01-03 Venezuela raid; 2026-02-20 Supreme Court ruling striking down the IEEPA tariffs (https://www.ropesgray.com/en/insights/alerts/2026/02/supreme-court-strikes-down-ieepa-tariffs-key-takeaways-and-implications-for-importers); 2026-02-28 Iran war (https://en.wikipedia.org/wiki/2026_Iran_war). |
| USA | `goals[3]` | "Promote democratic values and the rules-based order" | Off-profile for the current administration. Use era-specific goals: "Extract trade concessions through tariffs" and "Secure the Western Hemisphere (cartels, Venezuela, Cuba, Greenland)". |
| USA | `militaryBudgetPct` | 3.5 | about 3.2–3.4 is fine |
| CAN | `keyEvents` | ends 1994; 1995 is listed before 1994 | Add 2025 US tariffs and "51st state" pressure, and Carney's 2025-04-28 win. Carney reached a majority via by-elections on 2026-04-13 (https://www.producer.com/daily/carney-clinches-majority-government-in-special-elections/). |
| CAN | `militaryBudgetPct` | 1.4 → 2.0 | Canada met 2% in FY2025–26 [bk] |
| RUS | `sphereOfInfluence` | [IRN, PRK] → [BLR, UKR] | see A.1(4); add BLR to allies |
| RUS | `keyEvents` | ends 2022 | Add 2024 Kursk incursion and North Korean troops; 2024-06 treaty with North Korea; 2026-02-05 New START expiry (https://fas.org/publication/the-expiration-of-new-start/); 2026-09 Duma election, United Russia 349/450 seats (https://meduza.io/en/short/2026/09/21/how-russia-s-2026-election-results-compare-with-2021-preview-7899f07effff61f6b94e3a4369bf8c766882433ec7e51661bbc6fecdb4915c55). |
| RUS | `growthRate` | 0.012 → 0.009 | IMF Oct 2026, via Interfax (https://interfax.com/newsroom/top-stories/119514/) |
| RUS | `militaryBudgetPct` | 5.9 → about 6.5 | Russian budget law 2025–26 [bk] |
| DEU | `militaryBudgetPct` | 2.1 → 2.4 | Rising toward 3.5% by 2029: €108bn in 2026 [bk; fork research] |
| DEU | `internalDivisions` | — | Add "AfD surge / East–West divide": strength 30, tension 70. The AfD won about 44% in Saxony-Anhalt on 2026-09-06 (https://www.osw.waw.pl/en/publikacje/analyses/2026-09-07/germany-afd-scores-landslide-victory-saxony-anhalt). |
| FRA | `debtGdpRatio` | 111 → 116 | INSEE 2025 [bk] |
| FRA | `keyEvents` | ends 2015 | Add the 2024 dissolution / hung parliament and the 2025 PM churn (Bayrou falls, Lecornu named 2025-09-09, resigns 10-06, reappointed 10-10) [bk] |
| FRA | `historicalRivals` | [DEU, GBR, RUS] → [RUS] | anachronism |
| GBR | leader | (2025.json Starmer) | Andy Burnham has been PM since about 2026-07-20. Starmer resigned on 2026-06-22 after the May 2026 local-election rout (https://www.cp24.com/news/world/2026/07/13/uks-burnham-set-to-be-pm-after-securing-more-labour-mps-support/). |
| ITA | `keyEvents` | ends 2011 | Add Meloni's 2022 win and the lost justice referendum on 2026-03-23 (https://www.euronews.com/my-europe/2026/03/23/meloni-admits-defeat-as-italians-reject-judicial-reform-in-major-referendum) |
| ITA | `militaryBudgetPct` | 1.5 → 2.0 | NATO 2025 estimates [bk] |
| POL | `militaryBudgetPct` | 4.0 → 4.7 | NATO 2025 estimates [bk] |
| POL | `keyEvents` | — | Add 2025 Nawrocki presidency (vetoes); 2025-09-09/10 Russian drone incursion and Article 4 (https://wtop.com/world/2025/09/nato-warns-russia-it-will-use-all-means-to-defend-against-airspace-breaches-after-estonia-incursions) |
| POL | `historicalRivals` | [RUS, DEU] → [RUS, BLR] | |
| CHN | `military.warheads` | 500 → 600 (620 in 2026) | SIPRI |
| CHN | `sphereOfInfluence` | drop IDN | |
| CHN | `keyEvents` | ends 2018 | Add 2022 third term; 2025-10 / 2026-01 purge of the Central Military Commission (He Weidong, Zhang Youxia) (https://www.opb.org/article/2026/01/24/china-s-top-general-under-investigation-in-latest-military-purge/); 2025 Busan trade truce and 2026-05 Trump–Xi Beijing summit (https://www.timeslive.co.za/news/world/2026-05-14-chinas-xi-hails-trade-progress-in-trump-summit-warns-on-taiwan/) |
| CHN | `goals` | `targetCountryId` missing on "reunification with Taiwan" | Add `TWN` once Taiwan exists |
| IND | `warheads` | 172 → 180/190 | SIPRI |
| IND | `keyEvents` | ends 2020 | Add 2024 coalition re-election; 2025-04-22 Pahalgam attack, 2025-05-07/10 Operation Sindoor, Indus Waters Treaty "in abeyance" [bk] |
| PAK | `regimeType`, `politicalSystem.powerCenters` | DEMOCRACY, parliamentary first | Use AUTOCRACY (hybrid) with MILITARY as the first power center. Reasons: Asim Munir became Field Marshal in 2025-05, and the 27th Amendment of 2025-11 made him Chief of Defence Forces with immunity (https://www.arabnews.pk/node/2622517). |
| PAK | `keyEvents` | ends 2021 | Add 2023 jailing of Imran Khan; 2025 war with India; 2025-09-17 Saudi defence pact; 2026-02-27 "open war" with Taliban Afghanistan (https://365.military.com/feature/2026/02/27/pakistan-declares-open-war-afghan-taliban-airstrikes-hammer-kabul-and-kandahar.html) |
| PAK | `arms_suppliers` | [PRIVATE, USA] | Really mostly China. Schema gap, A.1(3). |
| PRK | `keyEvents` | ends 2017 | Add 2024-06 Russia treaty; 2024 "two hostile states" doctrine; 2024–25 troops to Kursk; 2026-02 9th Party Congress (https://en.wikipedia.org/wiki/9th_Congress_of_the_Workers%27_Party_of_Korea) |
| PRK | `historicalAllies` | [CHN, RUS] | OK; mark RUS as a treaty ally |
| KOR | `keyEvents` | ends 2017 | Add the 2024-12-03 martial law, the 2025 impeachment, Lee's election on 2025-06-03, and Yoon's 2026 life sentence |
| JPN | `keyEvents` | ends 2022 | Add 2025-11 Takaichi Taiwan remarks and Chinese coercion, including the 2026-01-06 dual-use export ban (https://ktvz.com/money/cnn-business-consumer/2026/01/06/china-bans-certain-rare-earths-and-other-exports-to-japan-for-military-purposes-over-takaichis-comments/); 2026-02-08 LDP supermajority (https://en.wikipedia.org/wiki/2026_Japanese_general_election) |
| IDN | `keyEvents` | ends 2014 | Add 2024 Prabowo inauguration and the 2025-08 deadly protests [bk] |
| AUS | `keyEvents` | ends 2021 | Add 2025-05-03 Albanese re-election and the 2025 Pentagon AUKUS review [bk] |
| IRN | `keyEvents` | ends 2020 | Add: 2022 Mahsa Amini protests; 2024-04 and 2024-10 direct exchanges with Israel; 2024-12 loss of Assad; 2025-06 Twelve-Day War and US strikes on Fordow, Natanz and Isfahan [bk]; 2025-09 UN snapback; 2026-01 protest massacre; 2026-02-28 Khamenei killed (https://en.wikipedia.org/wiki/2026_Iran_war) |
| IRN | `narrative` | "axis… from Lebanon to Yemen" via Syria | The Syria land bridge was lost 2024-12. Hezbollah is degraded. |
| IRN | for a 2026 start | stability 45 → 30, legitimacy 45 → 28, insurgency UNREST → REBELLION, GDP 400B → 330B | Override in scenario only |
| ISR | `population` | 9.8M → 10.1M; `gdp` 520B → about 610B (2025) | CBS / IMF [bk] |
| ISR | `keyEvents` | ends 2023 | Add 2024 Hezbollah war (Nasrallah killed 2024-09-27); 2025-06 Twelve-Day War; 2025-10-10 Gaza truce; 2026 Iran war and Lebanon invasion; 2026-10-27 election (https://en.wikipedia.org/wiki/2026_Israeli_legislative_election) |
| SAU | `keyEvents` | ends 2017 | Add 2023 Beijing-brokered détente with Iran; 2025-09-17 Pakistan pact; 2026 Iran war and Houthi strikes on Riyadh |
| SAU | leader style | PRAGMATIC → HAWKISH in 2026 | Saudi Arabia struck Iran and is fighting the Houthis' Red Sea coast offensive |
| EGY | `gdp` | 390B → about 350B (2025) | IMF; Suez Canal revenue collapse in 2024 [bk] |
| EGY | `keyEvents` | ends 2013 | Add 2024 Ras El-Hekma deal with the UAE and IMF program; 2025 GERD inauguration (an Egyptian red line) |
| TUR | `keyEvents` | ends 2017 | Add 2023 re-election; 2025-03 arrest of İmamoğlu and mass trial from 2026-03-09 (https://www.africanews.com/2026/03/09/corruption-trial-of-erdogan-opponent-and-400-others-opens-in-turkey); 2025-05 PKK dissolution [bk] |
| TUR | `politicalSystem.type` | PRESIDENTIAL_DEMOCRACY with regime AUTOCRACY | Acceptable "competitive authoritarian" mix |
| BRA | `keyEvents` | ends 2023 | Add 2025-09 Bolsonaro conviction [bk]; 2025 US 50% tariffs; Lula's 2026-10-25 runoff win, 51.8–48.2 (https://en.wikipedia.org/wiki/2026_Brazilian_general_election) |
| MEX | `keyEvents` | 1938 listed before 1929; ends 2018 | Add 2024 Sheinbaum election and judicial reform; 2025 US cartel FTO designations and tariffs; 2026-07 US refusal to extend USMCA as is (https://www.everycrsreport.com/files/2026-09-23_R48859_a8683dcc174769184796b79d7adefb7ece522d84.html) |
| MEX | `growthRate`, `debtGdpRatio` | 0.02 → 0.008; 50 → 58 | World Bank 2026 |
| NGA | `gdp`, `population` | 390B → about 285B (2025, after the 2025 rebasing; IMF projects 334B for 2026); population 223M → 230M | https://www.thisdaylive.com/2026/02/05/with-projected-gdp-of-334bn-in-2026-imf-tips-nigeria-as-africas-third-largest-economy-ahead-of-algeria/ |
| NGA | `keyEvents` | ends 2020 | Add the 2023 subsidy removal and naira float; 2025-12-25 US strikes on ISIS in Sokoto, at Nigeria's request (https://www.timeslive.co.za/news/2025-12-26-us-says-it-struck-islamic-state-militants-in-northwest-nigeria/) |
| ZAF | `gdp` | 380B → about 426B (2025) | IMF |
| ZAF | `keyEvents` | — | Add 2025 rupture with the US: G20 boycott and exclusion from the 2026 G20 (https://iol.co.za/news/south-africa/2025-11-27-trumps-g20-exclusion-of-south-africa-implications-for-economic-relations/) |
| ZAF | `keyEvents[2]` | "1989 Voluntary dismantling" | Decided 1989, completed 1991, disclosed 1993. Reword. |

### A.4 `data/scenarios/1960.json` and `1990.json` (historical scenarios)

These are in good shape: leaders, nuclear stockpiles and GDP are within normal estimation error. Issues found:

| File | Field | Current | Suggested | Note |
|---|---|---|---|---|
| 1960.json | `alliances` `["RUS","CHN"]` | full alliance | keep the treaty but set `initialRelations.RUS.CHN` to about 10–20 | The 1950 Sino-Soviet Treaty was still formally in force, but Moscow withdrew its advisers in July 1960. The split was already open (Lüshan 1959, Bucharest 1960). |
| 1960.json | `leaders.KOR` | Syngman Rhee | OK for Jan 1960 | Rhee resigned 1960-04 (April Revolution). A good scripted event. |
| 1960.json | `leaders.TUR` | Adnan Menderes | OK for Jan 1960 | Removed in the 1960-05-27 coup. A good scripted coup event. |
| 1960.json | `leaders.FRA.origin` | APPOINTED | ELECTED | de Gaulle was elected President by the electoral college in 1958-12. He had been *appointed* PM in 1958-06. |
| 1960.json | `leaders.SAU` | King Saud | OK | Effective power was shifting to Faisal |
| 1990.json | `alliances` | no `["RUS","POL"]` | add (weak) or set relations to about 0 | The Warsaw Pact formally existed until 1991-07-01 |
| 1990.json | `alliances` | — | consider `["IND","RUS"]` | 1971 Indo-Soviet treaty |
| 1990.json | `countryOverrides.IND` | TESTED, 0 warheads | fine; note covert weaponisation around 1988–90 (U) | |
| 1990.json | missing hotspot | — | add IRQ | Iraq invades Kuwait 1990-08-02, the defining crisis of the year |
| All | ordering | MEX 1938 before 1929; CAN 1995 before 1994 | sort by year | cosmetic |

---

## B. State of the world, November 2026 (the archive)

Dated developments from 2024 to October 2026, by region. This is the "archive" for the newspaper and timeline and for the debriefs. Items before mid-2025 are mostly [bk].

### B.1 Global

- **2025-04-02:** US "Liberation Day" universal tariffs set off a global tariff war [bk].
- **2026-02-20:** In *Learning Resources v. Trump* the US Supreme Court ruled 6–3 that the IEEPA emergency-powers law does not authorise tariffs. The same day the administration substituted a 10% global tariff under Section 122. The Section 232 sector tariffs (steel, aluminium, autos) remain. (https://www.ropesgray.com/en/insights/alerts/2026/02/supreme-court-strikes-down-ieepa-tariffs-key-takeaways-and-implications-for-importers)
- **2025-06-24/25:** NATO's Hague summit pledged 5% of GDP by 2035 (3.5% core defence plus 1.5% related) [bk].
- **2026-02-05:** **New START expired** with no successor. US–Russian strategic forces have no treaty limits for the first time since 1972. Russia offered to observe the central limits for a year if reciprocated; the status is unclear (U). (https://fas.org/publication/the-expiration-of-new-start/)
- **Economy:**
  - Oil spiked above $115/bbl after 2026-02-28 and above $100 again after the Iran ceasefire collapsed in July.
  - IMF April 2026: global growth 3.1%, with adverse and severe cases of 2.5% and 2% (https://fortune.com/2026/04/14/imf-slashes-global-growth-forecast-blaming-war-in-the-middle-east-for-halted-momentum/).
  - IMF October 2026: 3.1% for 2026 and 3.4% for 2027; world inflation 4.7% (https://www.australianindustrygroup.com.au/resourcecentre/research-economics/economics-intelligence/2026/global-forecasts-october-2026/).
- **SIPRI Yearbook 2026:** all nine nuclear states are modernising. China has about 620 warheads and India 190.

### B.2 Russia, Ukraine and Europe

**The war**
- **Territory:** Russia held about 19.25% of Ukraine (116,165 km²) at the start of 2026, gaining about 4,336 km² in 2025 (https://www.pravda.com.ua/eng/news/2026/01/01/8014292/). Its 2026 gains have been tiny:
  - ISW counts about 100 km² net since 1 Jan 2026, with a *net loss* of 122 km² since 1 Sep. Ukrainian forces are in western Kostiantynivka. Russian assaults continue around Pokrovsk, Huliaipole and Orikhiv. (https://www.criticalthreats.org/analysis/russian-offensive-campaign-assessment-october-16-2026)
  - A report that Pokrovsk and Myrnohrad were fully occupied by May 2026 is (U).
  - Mid-2024: the Kursk incursion [bk]; North Korean troops were deployed to Kursk in 2024–25 [bk].
- **Diplomacy** (https://en.wikipedia.org/wiki/Peace_negotiations_in_the_Russian_invasion_of_Ukraine):
  - 2025-08-15: Alaska summit [bk].
  - 2025-11: US 28-point plan, then a 19-point Geneva version.
  - 2025-12: Zelensky's 20-point plan.
  - Trilateral US–UKR–RUS rounds: Abu Dhabi on 2026-01-23/24 and 02-04/05, Geneva on 02-17/18. A US idea for a Donbas "free economic zone" was floated. The Iran war then froze the track.
  - 2026-04-11: 32-hour Easter truce.
  - 2026-05: a Victory Day truce that did not hold.
  - **2026-10-27/29:** a six-day local ceasefire in Oleshky, brokered via Melania Trump.
  - 2026-10-23: a 270-for-270 prisoner swap.
  - Abu Dhabi technical talks are expected around 2026-11-10 but are unscheduled. Peskov: "Russia needs peace, not a ceasefire." (https://cdapress.com/news/2026/oct/28/a-ceasefire-in-a-ukrainian-city-is-holding-officials-say-as-moscow-and-kyiv-await-us-led-talks/ ; https://www.khaleejtimes.com/europe/russia-ukraine-hold-peace-talks-nov-2026-ceasefire-oleshky)
  - The core deadlock: Moscow demands the rest of Donetsk oblast, and Kyiv says any withdrawal needs a referendum.
- **Money:**
  - 2025-12-19: the EU agreed a €90bn joint-debt loan for Ukraine in place of the frozen-assets "reparations loan". Hungary, Slovakia and Czechia opted out. (https://www.euronews.com/2025/12/20/the-eu-plans-to-raise-90-billion-in-joint-debt-for-ukraine-heres-how)
  - 2026-02-06: the EU's 20th sanctions package.
- **Ukraine domestic:**
  - 2025-11-28: chief of staff Yermak resigned amid a NABU corruption probe.
  - 2026-01-02: intelligence chief Budanov became head of the Presidential Office (https://euromaidanpress.com/2026/01/02/zelenskyy-appoints-budanov-to-replace-yermak-as-presidential-chief-of-staff/).
  - Martial law is extended to about 2027-01-29, so no elections can be held (https://ukranews.com/en/news/1183407-zelenskyy-proposes-rada-extend-martial-law-and-mobilization-until-january-29-2027).
- **Russia domestic:**
  - 2026-09-18/20: Duma election. United Russia won 349/450 seats, a constitutional majority.
  - Growth is about 0.9% (IMF).

**NATO's eastern flank**
- 2025-09-09/10: 19+ Russian drones entered Poland. Poland invoked Article 4 and NATO launched *Eastern Sentry*.
- Late 2025-09: Estonia invoked Article 4 over Russian jets, and drones closed Danish airports (https://wtop.com/world/2025/09/nato-warns-russia-it-will-use-all-means-to-defend-against-airspace-breaches-after-estonia-incursions).
- 2026-05-29: a drone incident in Romania.

**Belarus**
- 2025-01: Lukashenko began his 7th term.
- 2025-12: the Oreshnik intermediate-range missile was deployed, and Russia declared it on combat duty on 2025-12-30 (https://www.twz.com/land/russias-claims-oreshnik-ballistic-missile-now-on-combat-duty-in-belarus).
- Prisoners-for-sanctions deals with the US: 52 released in Sep 2025, 123 in Dec 2025 (including Bialiatski), and 250 on 2026-03-19, when the US lifted sanctions on potash and two state banks (https://www.adn.com/nation-world/2026/03/19/belarus-releases-250-political-prisoners-in-a-deal-with-the-us-to-lift-some-sanctions/). EU sanctions remain.

**Denmark and Greenland**
- 2026-01: Trump threatened tariffs on 8 European allies over Greenland.
- 2026-01-21 at Davos: an "Arctic security framework" was agreed with Rutte. The tariffs were dropped and force was ruled out (https://www.pbs.org/newshour/world/trump-cancels-tariff-threat-over-greenland-says-nato-agreed-to-framework-of-future-arctic-deal).
- The US reportedly seeks 3 more bases (NYT, 2026-04). No signed deal (U).
- Denmark held a snap election on 2026-03-24 and got a hung parliament; Frederiksen formed a minority government on 2026-06-02 (https://en.wikipedia.org/wiki/2026_Danish_general_election).

**Other European politics**
- **UK:** after Labour's May 2026 local-election collapse, Starmer resigned on 2026-06-22 and Andy Burnham became PM on about 2026-07-20 (https://brusselssignal.eu/2026/07/burnham-takes-labour-leadership-as-eu-uk-reset-stays-on-hold/).
- **France:** Lecornu was PM from 2025-09, resigned and was reappointed on 2025-10-10. He survives on a knife-edge over the 2027 budget. The presidential election is in April 2027.
- **Germany:** Merz has been chancellor since 2025-05. The debt-brake reform funds rearmament. The AfD leads national polls and won about 44% in Saxony-Anhalt (2026-09-06).
- **Hungary:** **Péter Magyar's Tisza won a two-thirds majority on 2026-04-12 and ended Orbán's rule** (https://www.rferl.org/a/hungarian-opposition-leader-magyar-landslide-victory-orban/33730633.html).
- **Italy:** Meloni lost the justice referendum on 2026-03-23 but stays in office.
- **Poland:** President Nawrocki (since 2025-08) is in a veto war with Tusk's government.

### B.3 Middle East

**The 2026 Iran war**, the single biggest event of the year (https://en.wikipedia.org/wiki/2026_Iran_war ; https://en.wikipedia.org/wiki/2026_Iran_war_ceasefire).
- **2025-06-13/24:** Twelve-Day War. The US struck Fordow, Natanz and Isfahan on 2025-06-22 [bk].
- **2025-09-28:** UN "snapback" sanctions restored [bk].
- **2026-01:** the regime crushed mass protests. The US built up its largest regional force since 2003.
- **2026-02:** talks failed, and Iran told the IAEA that safeguards were "untenable".
- **2026-02-28:** US ("Epic Fury") and Israeli ("Roaring Lion") strikes. **Supreme Leader Ali Khamenei was killed.**
  - Iran retaliated against Israel, US bases and Gulf states, and closed Hormuz.
  - Hezbollah, the Iraqi PMF and the Houthis joined. The UAE, Saudi Arabia, Kuwait and Bahrain struck Iran or its proxies at points.
- **2026-03-08/09:** the Assembly of Experts named **Mojtaba Khamenei** Supreme Leader. He was reportedly wounded and is rarely seen; his effective control is (U).
- **2026-04-08:** a two-week ceasefire mediated by Pakistan.
- **2026-04-11/12:** the Islamabad talks failed.
- **2026-04-13:** **US naval blockade of Iranian ports** (https://www.cfr.org/article/united-states-blockades-strait-of-hormuz-after-u-s-iran-talks).
- **2026-06-17:** the Islamabad Memorandum: a 60-day framework, and both blockades were lifted (https://www.thenationalnews.com/news/mena/2026/06/15/us-and-iran-agree-peace-framework-and-set-plan-to-reopen-strait-of-hormuz/).
- **2026-07-08:** the ceasefire collapsed after IRGC attacks on tankers. The US struck about 80 targets and reimposed the blockade. 3 US troops were killed in Jordan on 07-17.
- **2026-08:** a lull. Trump: "no talks" (https://www.aljazeera.com/news/2026/8/18/no-talks-with-iran-says-trump-as-us-president-stews-over-hormuz-deal).
- **2026-09:** strikes resumed, and Trump rejected an Iranian 7-day truce offer on 09-26.
- **2026-10:** about 9,000 more US troops arrived and more than 24 ships were attacked near Hormuz.
  - Trump pledged no new strikes before the 11-03 midterms.
  - On 10-28 Iran rejected a Qatari plan. Vance wrote to Mohsen Rezaei, and Araghchi called it a "positive step" (10-31).
  - **Status: undeclared low-intensity war, blockade in force, Hormuz disrupted.**
- **Costs:** about $47bn to the US, 23 US KIA, and about 3,500 dead in Iran by official counts.
- **Nuclear:** the IAEA believes more than 200 kg of 60% HEU is likely intact in the Isfahan tunnels. There has been no access since 2026-02 and no evidence of weaponisation (https://www.thenationalnews.com/news/europe/2026/03/10/irans-uranium-stockpile-likely-intact-in-isfahan-iaeas-grossi-says).

**Israel and Palestine**
- **Gaza:**
  - 2025-01-19 to 2025-03-18: truce, then the war resumed [bk].
  - **2025-10-10:** the Trump 20-point plan ceasefire took effect, and hostages were returned [bk].
  - 2025-11-17: UNSC Resolution 2803 endorsed the Board of Peace and an International Stabilization Force (ISF) [bk].
  - 2026-01: phase two launched with a technocratic administration committee (NCAG) (https://www.fdd.org/analysis/2026/01/16/phase-two-of-the-gaza-ceasefire-announced-despite-core-obstacles-still-to-overcome/).
  - By mid-2026 the ISF was at about 1% of its planned strength and Hamas was undisarmed. Israel holds about 64% of the strip behind the "yellow line" (https://www.arabnews.pk/node/2652620/middle-east).
  - More than 900 Palestinians have been killed since the truce. Israel struck Gaza on 2026-10-07.
- **Israeli election (2026-10-27):** preliminary results give Likud 27, Yashar (Eisenkot) 21, Bennett 12, and Netanyahu's bloc about 53 seats. A hung Knesset is likely, and Netanyahu remains caretaker. Results are certified 11-04 (https://en.wikipedia.org/wiki/2026_Israeli_legislative_election).
- **Palestinian Authority:** Hussein al-Sheikh has been VP and designated successor to Abbas since 2025. The PA vote has likely slipped to 2027-09 (U) (https://israelnationalnews.com/news/434361).

**Lebanon**
- 2024-09/11: war; Nasrallah killed; ceasefire 2024-11-27 [bk].
- 2025-01: Joseph Aoun elected president; Nawaf Salam became PM [bk].
- 2026-03-02: Hezbollah re-entered the war, and **Israel invaded the south on 2026-03-17**.
- 2026-06-19: ceasefire; 2026-06-26: framework agreement. Phased army deployment and pilot zones for IDF withdrawal followed (https://tribune.com.pk/story/2619640/).
- The 2026 elections were postponed to 2028 (https://www.thenationalnews.com/news/2026/03/09/lebanon-postpones-parliamentary-elections-for-two-years).

**Syria**
- 2024-12-08: Assad fell, and Ahmed al-Sharaa became president in 2025-01 [bk].
- 2026-01: the US repeal of the Caesar Act took effect (https://www.newarab.com/news/us-congress-moves-repeal-syrias-caesar-act-2026).
- 2026-01-13: a government offensive against the SDF, then integration deals on 01-18 and 01-30 (https://www.al-monitor.com/originals/2026/01/syrian-kurdish-led-sdf-agree-ceasefire-phased-integration-deal-government).
- 2026-09-03: Israel–Syria security talks collapsed over the buffer zone (https://en.yenisafak.com/world/israeli-bid-for-syria-security-deal-fails-over-buffer-zone-dispute-3722713).

**Iraq**
- 2025-11: elections.
- 2026-05-16: PM **Ali al-Zaidi** took office with a partial cabinet, squeezed between Washington and Tehran (https://thenationalnews.com/news/mena/2026/05/16/iraqs-al-zaidi-faces-mounting-pressure-from-iran-and-us-over-balance-of-government/).

**Yemen and the Red Sea**
- 2026-01: the separatist STC "dissolved" after its leader Zubaidi fled to the UAE; the dissolution is contested (https://wtop.com/world/2026/01/yemens-southern-transitional-council-to-dismantle-a-day-after-its-leader-fled-to-the-uae/).
- **2026-09:** a Houthi offensive on the Red Sea coast took Mokha (09-10) and reportedly Perim and Dhubab. This is the *Bab al-Mandab crisis* (https://euronews.com/2026/09/10/houthis-seize-red-sea-port-city-in-push-to-seize-bab-el-mandeb).
- 2026-10-04: a Saudi and government (PLC) counteroffensive.
- 2026-10-10: a Houthi strike on Riyadh's airport killed 13.

**Gulf, Turkey and Egypt**
- 2025-09-17: the **Saudi–Pakistan Strategic Mutual Defense Agreement** [bk; widely reported].
- The UAE deepened ties with Israel during the war (https://www.energyconnects.com/news/gas-lng/2026/may/uae-is-said-to-have-hit-iran-earlier-in-war-as-israel-ties-grow/).
- **Turkey:** İmamoğlu was arrested in 2025-03, and his mass trial began on 2026-03-09. The PKK announced its dissolution in 2025-05 and burned weapons in 2025-07 [bk]; implementation status in 2026 is (U).
- **Egypt:** Suez revenue collapsed in 2024–26. The GERD was inaugurated in 2025-09, which hardened the Nile dispute.

### B.4 Asia-Pacific and South Asia

**China, Taiwan and Japan**
- **Taiwan:**
  - 2024-05: Lai took office with a minority in the legislature.
  - 2025: mass recall votes against KMT legislators failed (07-26, 08-23) [bk].
  - PLA drills: *Strait Thunder-2025A* (2025-04) and **Justice Mission-2025** (2025-12-29/30), which simulated blockading Keelung and Kaohsiung after a record US$11.1bn US arms package (https://focustaiwan.tw/politics/202512300008).
  - 2026: the opposition legislature cut Lai's NT$1.25trn special defence budget to about half (https://focustaiwan.tw/politics/202604280021).
  - Local elections are in late November 2026; the date is (U).
- **China:**
  - Central Military Commission purge: He Weidong was expelled in 2025-10, and **Zhang Youxia and Liu Zhenli were placed under investigation on 2026-01-24**. The CMC is reportedly down to Xi plus Zhang Shengmin.
  - The 2025-10 Busan trade truce was extended at the **Trump–Xi Beijing summit (2026-05-13/15)**. Trump afterwards warned Taipei against independence (https://theonlinecitizen.com/2026/05/16/trump-warns-taiwan-against-independence-after-beijing-summit-with-xi-jinping).
- **Japan:**
  - PM Takaichi said in 2025-11 that a Taiwan contingency could be a "survival-threatening situation". China retaliated with a seafood ban, travel advisories and, on 2026-01-06, a dual-use and rare-earth export ban. Whether the ban is still in force is (U).
  - 2026-02-08: the LDP won a two-thirds supermajority.

**The Koreas**
- **South Korea:** the 2024-12-03 martial law led to Yoon's impeachment. Lee Jae-myung took office on 2025-06-04, and Yoon was sentenced to life on 2026-02-19.
- **North Korea:**
  - 2024-06: treaty with Russia.
  - 2026-02-19/25: the 9th Party Congress codified "two hostile states".
  - Missile tests on 2026-10-03 (hypersonic) and 2026-10-12 (a volley, one flying over 900 km) (https://www.dailymaverick.co.za/article/2026-10-12-north-korea-fires-missiles-days-after-south-koreas-hypersonic-test.md).

**India and Pakistan**
- 2025-04-22: the Pahalgam massacre. India put the Indus Waters Treaty "in abeyance".
- **2025-05-07/10: Operation Sindoor**, the first drone and missile war between nuclear powers, ended by a ceasefire [bk].
- In 2026 the treaty is still suspended. India is moving to restrict river flows, and Pakistan calls diversion an act of war (https://www.isas.nus.edu.sg/papers/the-indus-waters-treaty-india-pakistan-tensions-persist/ ; https://tribune.com.pk/story/2612412/).

**Pakistan and Afghanistan**
- 2025-10: border war, then mediation by Qatar and Turkey.
- **2026-02-27:** Pakistan bombed Kabul and Kandahar and declared "open war".
- 2026-03-19: temporary truce.
- Clashes continue as of 2026-10-17 (https://baynews9.com/fl/tampa/ap-top-news/2026/10/17/pakistani-forces-afghan-taliban-exchange-fire-after-militants-attempt-to-infiltrate-pakistan).
- Russia recognised the Taliban government on 2025-07-03 [bk]. Consultations in Moscow were held on 2026-10-05 (https://www.dawn.com/news/2000197).
- The 27th Amendment made Field Marshal Munir Chief of Defence Forces (2025-11).

**Philippines and the South China Sea**
- 2025-03-11: Rodrigo Duterte was surrendered to the ICC [bk].
- 2026-05: the House impeached Vice President Sara Duterte, and her Senate trial began on 2026-07-06 (https://www.arabnews.com/node/2649796/world).
- Scarborough Shoal: a warship standoff on 2026-06-20 and water-cannon attacks on 2026-07-23/24 (https://www.thejakartapost.com/world/2026/07/23/china-fires-water-cannon-on-philippine-ship-at-scarborough-shoal-manila-says).

**Other**
- **Thailand–Cambodia:** border war in 2025-07, renewed in 2025-12, ceasefire on 2025-12-27. Anutin won Thailand's 2026-02 election on a nationalist platform (https://www.thestar.com.my/news/world/2026/02/13/displaced-cambodians-in-limbo-as-nationalist-victory-in-thailand-adds-to-pressure).
- **Myanmar:** junta-run elections in 2025-12 and 2026-01. Min Aung Hlaing was elected president on 2026-04-03 (https://wtop.com/world/2026/04/myanmars-parliament-elects-ruling-general-as-president-keeping-the-army-in-charge-2).
- **Bangladesh:** Hasina was ousted in 2024-08 [bk]. The BNP won a landslide on 2026-02-12, and Tarique Rahman became PM on 2026-02-17 (https://www.startribune.com/bangladeshs-new-prime-minister-is-sworn-in-after-his-partys-landslide-election-win/601583659).
- **Australia:** Albanese was re-elected on 2025-05-03 [bk].

### B.5 Americas

**United States**
- Trump's second term began on 2025-01-20.
- National Guard deployments: the Supreme Court kept the Chicago deployment blocked on 2025-12-23 (https://theweek.com/politics/supreme-court-bars-trumps-military-use-in-chicago).
- **Midterms on 2026-11-03:** Democrats are favoured for the House at about D+6 on the generic ballot. The Senate is (U) (https://www.natesilver.net/generic-ballot-average-2026-nate-silver-bulletin-congress-polls).

**Venezuela**
- From 2025-09: US strikes on alleged drug boats.
- **2026-01-03: a US raid captured Maduro**, who is on trial in New York. Delcy Rodríguez was sworn in as acting president on 2026-01-05 (https://www.pbs.org/newshour/world/who-is-delcy-rodriguez-venezuelas-interim-president-after-maduros-ouster).
- After that (https://en.wikipedia.org/wiki/2026_in_Venezuela):
  - a new hydrocarbons law ended PDVSA's monopoly;
  - an amnesty law;
  - the US embassy reopened on 2026-03-14;
  - the defence minister was replaced on 2026-03-18;
  - US sanctions on Rodríguez were lifted on 2026-04-05;
  - Venezuela left the ICC on 2026-07-24;
  - Rodríguez met Trump in 2026-09 and pledged elections, with no date set.
- Opposition leader Machado (Nobel Peace Prize 2025) has been sidelined by Washington.

**Cuba**
- **US oil blockade from 2026-01-03.** Mexico halted shipments on 01-27. A 01-29 executive order put tariffs on any oil seller to Cuba.
- Total grid collapse on 2026-03-16/22; a party office was burned in Morón (03-14).
- Talks with the US were confirmed on 03-13. 2,010 prisoners were pardoned on 2026-04-02.
- Raúl Castro was indicted on 05-20, and Díaz-Canel was sanctioned on 06-05.
- A private-enterprise reform package was adopted on 06-18. Blackouts recurred through 09-18. (https://en.wikipedia.org/wiki/2026_in_Cuba)

**Elsewhere in Latin America**
- **Colombia:** Trump-endorsed **Abelardo de la Espriella** won the runoff on 2026-06-21 (about 49.7–48.7) and took office on 2026-08-07 (https://www.record-eagle.com/ap/international/trump-endorsed-de-la-espriella-declared-winner-of-colombia-s-presidential-runoff-election/article_e9f17b15-2a92-59c7-ae7b-c419f4eb3b5f.html).
- **Brazil:**
  - Bolsonaro was convicted in 2025-09 [bk], and the US imposed 50% tariffs.
  - First round 2026-10-04: Flávio Bolsonaro 47.0%, Lula 45.2%.
  - **Runoff 2026-10-25: Lula 51.79%, Flávio 48.21%.** Flávio demanded annulment, and Trump called it "rigged". The PL is the largest party in both chambers. (https://en.wikipedia.org/wiki/2026_Brazilian_general_election)
- **Mexico:** Sheinbaum rejects US military action on Mexican soil. The USMCA review broke down in 2026-07, and growth is below 1%.
- **Argentina:** Milei won the 2025-10-26 midterms, backed by a $20bn US swap line, which Argentina repaid in 2026-01 (https://americasquarterly.org/article/argentina-a-2026-snapshot/).
- **Canada:** Carney won in 2025-04 and gained a majority via by-elections on 2026-04-13.

### B.6 Africa

**Sudan**
- 2025-03: the army (SAF) retook Khartoum.
- **2025-10-26: El Fasher fell to the RSF** with mass atrocities, and the RSF's parallel "Tasis" government sits in Nyala.
- 2026:
  - the army broke the Dalang and Kadugli sieges (02);
  - the RSF set up its own central bank (05-11);
  - **El Obeid was besieged** (07) (https://www.aljazeera.com/news/2026/7/6/el-obeid-under-siege-by-rsf-could-this-be-sudans-next-el-fasher);
  - the EU banned imports of Sudanese gold (07-14);
  - a drone strike in Abyei killed 153 (10-19).
- The Quad truce (US, Saudi Arabia, Egypt, UAE) has never held (https://en.wikipedia.org/wiki/2026_in_Sudan).

**Ethiopia**
- 2025-09: the GERD was inaugurated.
- 2026-06-01: election. The Prosperity Party won 438 of 501 contested seats; there was no voting in Tigray (https://www.thestar.com.my/news/world/2026/06/21/ethiopian-prime-minister039s-party-wins-parliamentary-majority-election-results-show).
- **About 2026-09-23: the TPLF declared a new war**, allied with the Fano militia. The Pretoria peace deal is effectively dead (https://www.thestar.com.my/news/world/2026/09/23/tigrayan-leaders-say-new-war-with-ethiopian-government-has-begun-as-fighting-erupts).
- 2026-10-05: Abiy began a new term with Red Sea rhetoric.
- 2026-10-08: AFP reported Eritrean troops in Tigray (https://tribune.com.pk/story/2633644/eritrean-troops-deployed-in-ethiopias-tigray-region).

**Elsewhere in Africa**
- **Nigeria:**
  - 2025-11: the US designated Nigeria a "Country of Particular Concern" and threatened action.
  - **2025-12-25: US Tomahawk strikes on ISIS in Sokoto**, at Nigeria's request.
  - The presidential election is set for 2027-01-16 (https://nairametrics.com/2026/02/27/inec-revises-2027-election-timetable-presidential-poll-now-holds-january-16/).
- **South Africa:** the US boycotted the Johannesburg G20 and excluded South Africa from the 2026 G20 in Miami. A 12.5% US tariff applies (U). Local elections are on 2026-11-04.
- **Sahel:** from 2026-04-25 the jihadist JNIM and the separatist FLA ran an offensive in Mali that took Kidal and killed the defence minister. JNIM declared a siege of Bamako (https://www.fdd.org/analysis/jnim-and-allied-rebels-surge-across-mali-take-several-cities-pressure-capital/).
- **DRC:** the Washington Accords (2025-12) and the Doha framework were signed, but M23 took Uvira in 2025-12 before withdrawing in 2026-01. Drone war is escalating (https://ipisresearch.be/publication/shifting-frontlines-in-2026-new-year-old-challenges-hostilities-in-eastern-drc-continue-amid-increased-diplomatic-efforts/).

---

## C. Current leaders, 1 November 2026

The fields follow `LeaderSchema`: style is HAWKISH, DOVISH, PRAGMATIC, REFORMIST or HARDLINER; origin is ELECTED, COUP, SUCCESSION, REVOLUTION, APPOINTED or FOUNDING. "Since" is the date in the current office.

### C.1 Existing 25

| ID | Name | Title | Style | Origin | Since | Next election | Notes |
|---|---|---|---|---|---|---|---|
| USA | Donald Trump | President | HAWKISH | ELECTED | 2025-01 | 2028-11 | Midterms 2026-11-03 |
| CHN | Xi Jinping | General Secretary | HARDLINER | APPOINTED | 2012-11 | none | 21st Party Congress about 2027-10 |
| RUS | Vladimir Putin | President | HAWKISH | ELECTED | 2000-05* | 2030-03 | *continuous rule; current term since 2024-05 |
| DEU | Friedrich Merz | Chancellor | PRAGMATIC | ELECTED | 2025-05 | 2029-03 | |
| IND | Narendra Modi | Prime Minister | HAWKISH | ELECTED | 2014-05 | 2029-05 | |
| BRA | Luiz Inácio Lula da Silva | President | PRAGMATIC | ELECTED | 2023-01 | 2030-10 | Re-elected 2026-10-25; new term 2027-01 |
| CAN | Mark Carney | Prime Minister | PRAGMATIC | ELECTED | 2025-03 | 2029-10 | |
| MEX | Claudia Sheinbaum | President | PRAGMATIC | ELECTED | 2024-10 | 2030-06 | |
| FRA | Emmanuel Macron | President | PRAGMATIC | ELECTED | 2017-05 | 2027-04 | PM Sébastien Lecornu (APPOINTED 2025-09) |
| GBR | Andy Burnham | Prime Minister | REFORMIST | SUCCESSION | 2026-07 | by 2029-08 | Succeeded Starmer through a party leadership vote |
| POL | Donald Tusk | Prime Minister | PRAGMATIC | ELECTED | 2023-12 | 2027-10 | President Karol Nawrocki (2025-08), nationalist, uses vetoes |
| TUR | Recep Tayyip Erdoğan | President | HAWKISH | ELECTED | 2014-08 | 2028-05 | |
| SAU | Mohammed bin Salman | Crown Prince and Prime Minister | HAWKISH | SUCCESSION | 2017-06 | none | King Salman is nominal head of state |
| IRN | Mojtaba Khamenei (U) | Supreme Leader | HARDLINER | SUCCESSION | 2026-03 | none | Reportedly wounded; President Pezeshkian (PRAGMATIC, ELECTED 2024-07, next 2028-06) |
| ISR | Benjamin Netanyahu | Prime Minister (caretaker) | HAWKISH | ELECTED | 2022-12 | next Knesset by 2030-10 | Coalition talks after the 2026-10-27 vote |
| EGY | Abdel Fattah el-Sisi | President | HARDLINER | COUP | 2014-06 | 2030-03 | |
| JPN | Sanae Takaichi | Prime Minister | HAWKISH | ELECTED | 2025-10 | upper house 2028-07; lower house by 2030-02 | |
| IDN | Prabowo Subianto | President | HAWKISH | ELECTED | 2024-10 | 2029-02 | PRAGMATIC is also defensible |
| KOR | Lee Jae-myung | President | PRAGMATIC | ELECTED | 2025-06 | 2030-06 | |
| PRK | Kim Jong Un | General Secretary | HARDLINER | SUCCESSION | 2011-12 | none | |
| AUS | Anthony Albanese | Prime Minister | PRAGMATIC | ELECTED | 2022-05 | by 2028-09 | |
| PAK | Shehbaz Sharif | Prime Minister | PRAGMATIC | ELECTED | 2024-03 | 2029-02 | Real power: Field Marshal Asim Munir, Chief of Defence Forces |
| NGA | Bola Tinubu | President | PRAGMATIC | ELECTED | 2023-05 | 2027-01 | |
| ZAF | Cyril Ramaphosa | President | PRAGMATIC | ELECTED | 2018-02 | 2029-05 | Leads a coalition government (GNU) |
| ITA | Giorgia Meloni | Prime Minister | PRAGMATIC | ELECTED | 2022-10 | 2027 (by late 2027) | |

### C.2 Proposed new countries

| ID | Name | Title | Style | Origin | Since | Next election | Notes |
|---|---|---|---|---|---|---|---|
| UKR | Volodymyr Zelensky | President | HAWKISH | ELECTED | 2019-05 | none (martial law) | Budanov is head of the Presidential Office |
| TWN | Lai Ching-te | President | PRAGMATIC | ELECTED | 2024-05 | 2028-01 | Local elections about 2026-11-28 |
| BLR | Alexander Lukashenko | President | HARDLINER | ELECTED | 1994-07 | 2030-01 | Origin is formally ELECTED; elections are not free |
| DNK | Mette Frederiksen | Prime Minister | PRAGMATIC | ELECTED | 2019-06 | by 2030-03 | Minority government since 2026-06 |
| SYR | Ahmed al-Sharaa | President | PRAGMATIC | REVOLUTION | 2025-01 | none | Transitional constitution |
| IRQ | Ali al-Zaidi | Prime Minister | PRAGMATIC | APPOINTED | 2026-05 | 2029-11 | President Nizar Amedi |
| PSX | Mahmoud Abbas | President (PA) | DOVISH | ELECTED | 2005-01 | 2027-09 (U) | Successor-designate Hussein al-Sheikh; Gaza run by the NCAG technocratic committee and Hamas remnants |
| LBN | Joseph Aoun | President | REFORMIST | ELECTED | 2025-01 | parliament 2028-05 | PM Nawaf Salam (2025-02) |
| YEM | Abdul-Malik al-Houthi | Leader of the Revolution | HARDLINER | REVOLUTION | 2014-09 | none | The profile models Sanaa. Recognised government (PLC): Rashad al-Alimi (2022-04) |
| ARE | Mohamed bin Zayed | President | HAWKISH | SUCCESSION | 2022-05 | none | |
| AFG | Hibatullah Akhundzada | Supreme Leader | HARDLINER | SUCCESSION | 2016-05 | none | |
| PHL | Ferdinand Marcos Jr. | President | PRAGMATIC | ELECTED | 2022-06 | 2028-05 | Term-limited |
| VEN | Delcy Rodríguez | Acting President | PRAGMATIC | SUCCESSION | 2026-01 | none scheduled | Under US tutelage |
| CUB | Miguel Díaz-Canel | First Secretary and President | HARDLINER | APPOINTED | 2018-04 | 2028 (indirect) | |
| SDN | Abdel Fattah al-Burhan | Chairman, Sovereignty Council | HAWKISH | COUP | 2019-08 | none | PM Kamil Idris; RSF rival government under Hemedti in Nyala |
| ETH | Abiy Ahmed | Prime Minister | HAWKISH | ELECTED | 2018-04 | 2031-06 | New term 2026-10 |

For reference, outside the roster: Argentina is led by Javier Milei (REFORMIST, ELECTED 2023-12, next election 2027-10). Colombia is led by Abelardo de la Espriella (HAWKISH, ELECTED 2026-08, next 2030-05). Hungary is led by Péter Magyar (REFORMIST, ELECTED 2026-05).

---

## D. Proposed new countries (16)

The selection criterion was to maximise *playable current flashpoints* (sections E and F) while filling regional gaps. Every proposed country is either:
- a belligerent in a 2026 conflict;
- the target of a 2026 great-power crisis; or
- a pivotal swing state.

All 16 profiles are in `dev_plan/reviews/geo-data/` and pass `CountryProfileSchema`. They were validated with `/tmp/claude-1000/-home-emanuel-git-WorldConflict/560a71e3-7113-4ffa-aea8-74191a508a8c/scratchpad/geo/validate.ts`. Each has 8–10 key events through 2026, 3 red lines, 3 internal divisions and 4 goals.

| ID (map) | Country | Why it is in | Flashpoints |
|---|---|---|---|
| UKR | Ukraine | The largest war in Europe since 1945; without it the 2025 and 2026 scenarios are false | F1 |
| TWN | Taiwan | The most consequential US–China flashpoint; China's red lines and goals already reference it | F3 |
| BLR | Belarus | Russia's only treaty ally; hosts Oreshnik and tactical nuclear weapons; borders Poland and the Suwałki gap; prisoners-for-sanctions diplomacy | F1, reserve |
| DNK | Denmark | The 2026 Greenland crisis: an intra-NATO coercion case and the Arctic | Reserve |
| SYR | Syria | Post-Assad transition; Israeli buffer zone; Turkish patron; SDF integration | 2026 scenario |
| IRQ | Iraq | Iran's militia corridor (PMF); US–Iran balancing; oil | F2 |
| PSX | Palestine (PA plus Gaza) | Gaza war and day-after, West Bank annexation risk. Needed for any Israel scenario. | Reserve |
| LBN | Lebanon | Hezbollah front; Israeli occupation of the south in 2026 | Reserve |
| YEM | Yemen (Houthi authority) | Red Sea and Bab al-Mandab; strikes on Saudi Arabia, Israel and shipping | F5 |
| ARE | United Arab Emirates | Sudan's RSF patron; Iran war co-belligerent; Abraham Accords; Red Sea ports | F2, F8 |
| AFG | Afghanistan (Taliban) | War with Pakistan in 2026; recognised by Russia | 2026 scenario |
| PHL | Philippines | Scarborough and the Second Thomas Shoal; US treaty ally | F6 |
| VEN | Venezuela | Post-Maduro transition under US tutelage; oil | F4 |
| CUB | Cuba | US oil blockade and grid collapse; potential regime transition | F4 |
| SDN | Sudan | The world's largest humanitarian crisis; a proxy war involving the UAE, Egypt, Turkey and Russia | F8 |
| ETH | Ethiopia | Tigray war resumed in 2026; Eritrea; the Nile dispute with Egypt over the GERD | F8 reserve |

**Considered and deferred.** Next tier, in priority order:
- **Armenia/Azerbaijan:** largely settled by the 2025-08 Washington declaration [bk].
- **Kazakhstan** and **Serbia/Kosovo**.
- **Myanmar:** junta-run civil war, low playability.
- **Somalia/Somaliland** and **Eritrea:** Eritrea would add value if the Ethiopia–Eritrea war materialises.
- **Hungary:** its 2026 flip from Orbán to Magyar matters for EU unity mechanics.
- **Vietnam**, **Colombia**, **Argentina**, **Mali**, **DRC**, and **Qatar** (mediator).

If the cap is 15, drop DNK and run Greenland as an event card attached to the USA.

**Map code checks against `ui/public/world.geojson` (ADM0_A3):**
- **Palestine is `PSX`, not `PSE`.** The ISO_A3 is `PSE`, and the feature's SOVEREIGNT is "Israel". The profile uses `id`/`iso3` = `PSX` so it joins the map. If the backend ever needs ISO codes, add an alias table.
- **Taiwan is `TWN`**, a standalone feature. It matches.
- **Greenland is its own feature, `GRL`** (SOVEREIGNT "Denmark"), so the `DNK` polygon is continental Denmark only. A Greenland flashpoint needs a GRL→DNK join alias, or a separate GRL sub-entity.
- UKR, BLR, DNK, SYR, IRQ, LBN, YEM, ARE, AFG, PHL, VEN, CUB, SDN and ETH all match.
- Note for future additions: Northern Cyprus (`CYN`), Somaliland (`SOL`) and Kosovo (`KOS`) have ISO_A3 `-99`. Western Sahara is `SAH` (ISO `ESH`).

**Modelling choices worth knowing:**
- **UKR:** `militaryBudgetPct` is capped at the schema maximum of 20; the real figure is about 26–30% of GDP. Population is about 33M under government control.
- **BLR:** `nuclearStatus` is NONE even though it hosts Russian weapons. The engine cannot express hosted weapons.
- **PSX:** modelled as one PA-plus-Gaza polity with GUERILLA insurgency, stability 10, and an economy reflecting the 2024–25 collapse.
- **YEM:** models the de facto Houthi state in Sanaa. The recognised government (PLC) and the southern separatists (STC) appear as internal divisions. A purist alternative is a second entity.
- **SDN:** the RSF is not a country. It appears as GUERILLA insurgency plus a high-tension internal division. ARE is a rival.
- **TWN:** `nuclearStatus` is LATENT; it had a covert program until 1988. Its bounds include Kinmen.
- **GDP estimates** for CUB ($40bn), SDN ($32bn), ETH ($125bn), PSX ($13bn) and YEM ($17bn) are estimates (U), because reliable 2025–26 national accounts do not exist.

---

## E. "2026" scenario spec

- **Recommended id and name:** `2026` / "Age of Ruptures (November 2026)".
- **Start date:** `startYear: 2026, startMonth: 11`.

Why November 2026 rather than January 2027:
- Turn 1 lands on the US midterms (11-03), the certification of the Israeli result (11-04) and Israeli coalition talks.
- The Abu Dhabi Ukraine talks are due around 11-10.
- Taiwan's local elections fall around 11-28.
- Iran is at a decision point: the Vance letter and Trump's pledge of no strikes before the midterms.
- Brazil's contested result is fresh.
- Every one of these is a decision card waiting to happen, and they are real.

### E.1 Global parameters

```json
"globalTension": 74,
"multipliers": { "gdpGrowth": 0.85, "militarySpending": 1.2, "stability": 0.95 }
```

- **Tension:** two active interstate wars (Ukraine, Iran) plus the Yemen–Saudi and Pakistan–Afghanistan fronts, Hormuz disruption and no nuclear arms control. Tension sits in the mid-70s rather than 90 because no great-power war between the US and China or NATO and Russia is under way.
- **Growth:** the 0.85 multiplier reflects the oil shock (IMF Oct 2026: 3.1% world growth, inflation 4.7%).

### E.2 Starting wars

| attackerId | defenderId | frontline | Rationale |
|---|---|---|---|
| RUS | UKR | **55** | Russia holds about 19.3%, but 2026 gains are about 0.2% with a net loss since September (ISW). Slight Russian initiative, near-stalemate. Suggested exhaustion about 60. |
| USA | IRN | **60** | US air and naval dominance and an effective blockade, but there is no ground war, the regime survives and the HEU stockpile is intact. Exhaustion about 55. Its political clock is the midterms. |
| ISR | IRN | **58** | Co-belligerent since 2026-02-28. Could merge with the above if the engine prefers one war per pair. |
| YEM | SAU | **55** | The Houthi coastal offensive (Sep 2026) has partially succeeded and the Saudi/PLC counteroffensive began 10-04. Exhaustion about 40. |
| PAK | AFG | **55** | Pakistan has air superiority while the Taliban hold the ground. Low intensity. Exhaustion about 50; the ceasefire status is (U). Optional. |

**Do not encode these as wars.** Use border deployments, insurgency and relations instead, because they are under ceasefire or occupation regimes and the engine would otherwise resume active combat:
- **ISR–PSX:** truce since 2025-10-10, with Israel holding about 64% of Gaza.
- **ISR–LBN:** ceasefire 2026-06-19, Israel occupying the south.
- **SDN** civil war: RSF modelled as GUERILLA insurgency.
- **ETH:** TPLF and Fano modelled as REBELLION.
- **Thailand–Cambodia:** not in the roster.

Suggested `borderDeployments`:
- ISR→PSX 60k, ISR→LBN 30k, ISR→SYR 10k (buffer zone);
- CHN→TWN, which escalates on events;
- IND→PAK and PAK→IND 100k each;
- RUS/BLR→POL 20k.

### E.3 Alliances

```json
"alliances": [
  ["USA","CAN","GBR","FRA","DEU","ITA","POL","TUR","DNK"],
  ["USA","JPN"], ["USA","KOR"], ["USA","PHL"], ["USA","AUS"],
  ["USA","GBR","AUS"],
  ["USA","ISR"],
  ["RUS","BLR"], ["RUS","PRK"], ["CHN","PRK"],
  ["SAU","PAK"]
]
```

- **The first entry is NATO** (only game members are listed).
- **`["USA","GBR","AUS"]` is AUKUS.**
- **`["USA","ISR"]`** is de facto, not a treaty; co-belligerent against Iran.
- **`["RUS","BLR"]`** is the Union State plus CSTO. **`["RUS","PRK"]`** is the 2024 treaty and **`["CHN","PRK"]`** the 1961 treaty.
- **`["SAU","PAK"]`** is the Strategic Mutual Defense Agreement of 2025-09-17.

Not alliances; model these as relations and orientation:
- **Quad** (USA, JPN, IND, AUS): relations of 55–75.
- **Abraham Accords** (ISR with ARE, plus Bahrain and Morocco, which are not in the roster): ISR–ARE 45.
- **US commitment to Taiwan** under the Taiwan Relations Act: USA–TWN 55, with a US red line on forced unification.
- **SCO/BRICS alignment:** CHN, RUS, IND, IRN, PAK, BLR, plus BRA, ZAF, EGY, ETH, ARE, IDN in BRICS. This should be a soft relations bonus of about +10 among members, not an alliance. Saudi Arabia has not formally joined BRICS (U).
- **"Coalition of the willing" for Ukraine** (GBR, FRA, DEU, POL, DNK, CAN, ITA): UKR relations of 75–90.
- **Russia–Iran:** the 2025 Comprehensive Strategic Partnership treaty has **no** mutual-defence clause, so do not ally them. Russia gave Iran no military help in 2025 or 2026.

### E.4 Notable bilateral relations (-100 to 100)

Values are symmetric unless they are shown as A→B / B→A.

| Pair | Value | Pair | Value |
|---|---|---|---|
| USA–RUS | -45 | USA–CHN | -40 |
| USA–UKR | 45 | USA–IRN | -95 |
| USA–ISR | 85 | USA–SAU | 60 |
| USA–ARE | 75 | USA–TWN | 55 |
| USA–JPN | 75 | USA–KOR | 65 |
| USA–PHL | 75 | USA–AUS | 70 |
| USA–GBR | 70 | USA–DEU | 50 |
| USA–FRA | 40 | USA–POL | 75 |
| USA–ITA | 65 | USA–CAN | 30 |
| USA–DNK | 20 | USA–MEX | 40 |
| USA–BRA | 10 | USA–ZAF | 5 |
| USA–IND | 25 | USA–PAK | 40 |
| USA–VEN | 20 | USA–CUB | -80 |
| USA–BLR | -15 | USA–SYR | 40 |
| USA–IRQ | 20 | USA–NGA | 30 |
| RUS–UKR | -100 | RUS–BLR | 85 |
| RUS–CHN | 65 | RUS–PRK | 75 |
| RUS–IRN | 40 | RUS–IND | 45 |
| RUS–POL | -80 | RUS–GBR | -70 |
| RUS–DEU | -60 | RUS–FRA | -60 |
| RUS–DNK | -60 | RUS–AFG | 45 |
| RUS–CUB | 55 | UKR–GBR | 85 |
| UKR–DEU | 80 | UKR–FRA | 80 |
| UKR–DNK | 90 | UKR–POL | 60 |
| UKR–CAN | 75 | UKR–BLR | -60 |
| POL–BLR | -70 | CHN–TWN | -80 |
| CHN–JPN | -60 | CHN–PHL | -65 |
| CHN–IND | -30 | CHN–PAK | 75 |
| CHN–PRK | 50 | CHN–IRN | 40 |
| CHN–AFG | 25 | JPN–TWN | 65 |
| JPN–KOR | 45 | JPN–PHL | 70 |
| KOR–PRK | -80 | IND–PAK | -85 |
| PAK–AFG | -70 | IND–AFG | 20 |
| IRN–ISR | -100 | IRN–SAU | -70 |
| IRN–ARE | -85 | IRN–IRQ | 30 |
| IRN–YEM | 80 | IRN–LBN | 10 |
| ISR–PSX | -90 | ISR–LBN | -50 |
| ISR–SYR | -30 | ISR–TUR | -70 |
| ISR–ARE | 45 | ISR–SAU | 10 |
| ISR–EGY | 25 | SAU–YEM | -90 |
| SAU–ARE | 10 | SAU–PAK | 75 |
| TUR–SYR | 75 | SDN–ARE | -70 |
| SDN–EGY | 40 | SDN–TUR | 50 |
| SDN–ETH | -45 | ETH–EGY | -70 |
| ETH–ARE | 60 | VEN–CUB | 30 |
| CUB–MEX | 30 | BRA–VEN | 5 |

- **SAU–ARE:** a real rift over Yemen and Sudan.
- **SDN–EGY:** Egypt backs the army.
- **VEN–CUB:** oil was cut off under US pressure.

### E.5 Nuclear statuses

| ID | Status | Warheads / progress | Note |
|---|---|---|---|
| USA | ARMED | 5,177 | No New START limits since 2026-02 |
| RUS | ARMED | 5,459 | Tactical weapons and Oreshnik in Belarus |
| CHN | ARMED | 620 | |
| FRA | ARMED | 290 | |
| GBR | ARMED | 225 | |
| IND | ARMED | 190 | |
| PAK | ARMED | 170 | |
| ISR | ARMED | 90 | Undeclared |
| PRK | ARMED | 50 (U: 50–60) | |
| IRN | DEVELOPING | progress **55** (range 45–70, U) | More than 200 kg of 60% HEU believed intact at Isfahan, but enrichment halls damaged and no IAEA access. Set beliefs about Iran's progress to low accuracy for all countries. |
| SAU | LATENT | — | Has said it would match an Iranian bomb; the Pakistan pact raises "extended deterrence" questions |
| JPN, KOR, TWN, DEU | LATENT | — | South Korea's domestic nuclear debate is rising |
| BLR | NONE (host) | — | Engine gap: hosted weapons |

### E.6 Sanctions and embargoes

The scenario schema cannot currently express these (see G). Proposed values:

| Target | embargoedBy | underGlobalEmbargo | Note |
|---|---|---|---|
| RUS | USA, GBR, FRA | false | EU 20th package; US sanctions on Rosneft and Lukoil since 2025-10 [bk] |
| IRN | USA, GBR, FRA | **true**? | UN snapback since 2025-09 plus the US naval blockade. Use `true` only if the engine's global-embargo semantics match a blockade. |
| PRK | USA, GBR, FRA | true | UN sanctions |
| BLR | GBR, FRA | false | US partly lifted in 2026-03 |
| CUB | USA | false | Plus the secondary oil "blockade" |
| VEN | — | false | Mostly eased by US licences; 12.5% US tariff |
| AFG | USA | false | UN 1988 regime |
| SYR | — | false | Caesar Act repealed 2026-01 |
| SDN | — | false | EU gold ban; UK and US sanctions on commanders on both sides |
| YEM | USA | false | US terrorist (FTO) designation of the Houthis |

### E.7 Key country overrides for existing countries (2026 start)

| Country | Override |
|---|---|
| IRN | stability 30, legitimacy 28, insurgency REBELLION, gdp 330e9, growthRate -0.08, nuclearProgress 55 |
| ISR | stability 50, gdp 610e9, population 10.1e6, militaryBudgetPct 7 |
| RUS | growthRate 0.009, militaryBudgetPct 6.5, stability 60 |
| USA | gdp 31e12, militaryBudgetPct 3.3, stability 58 (polarisation, midterms) |
| GBR | stability 60 (new PM) |
| FRA | stability 55 (budget crisis, censure risk) |
| DEU | militaryBudgetPct 2.4 |
| POL | militaryBudgetPct 4.7 |
| SAU | militaryBudgetPct 7, stability 62 |
| PAK | regimeType AUTOCRACY, insurgency REBELLION |
| KOR | stability 70 |
| JPN | militaryBudgetPct 1.9 (target 2% by FY2027) |
| BRA | stability 55 (contested result) |
| MEX | growthRate 0.008 |
| NGA | gdp 334e9 |
| EGY | growthRate 0.035, stability 50 |
| IDN | stability 58 |
| ZAF | gdp 426e9 |

### E.8 Scripted events for the first 6 turns (suggested)

1. **US midterms** (turn 1): if the Democrats take the House, US approval and stability shift. This affects Iran and Ukraine war exhaustion.
2. **Israeli coalition outcome** (turns 1–2): Netanyahu bloc, Eisenkot/Bennett government or new elections. Each sets ISR personality: warPropensity −10 under a centrist government.
3. **Abu Dhabi talks** (turn 1): PendingDecision for UKR/RUS/USA (see F1).
4. **Taiwan local elections** (turn 1): a KMT sweep reduces TWN defence spending.
5. **Iran:** the response to the Vance letter becomes a negotiation or escalation branch (see F2).
6. **Brazil:** an annulment demand leads to a protest wave event (turn 1–2).
7. **Nigeria election** (2027-01, turn 3), **French presidential** (2027-04, turn 6) and **Ukraine martial-law renewal** (2027-01, turn 3).

---

## F. Flashpoint scenarios (8)

Common design:
- Each flashpoint is a short session: 10–15 minutes and 8–15 turns.
- Each has a scenario-specific `turnLength` (week or month), a goal checker, and 2–4 signature PendingDecision cards using the existing `effects` and `tensionDelta` vocabulary.
- Consequence keys below mirror `events.ts`: `approval`, `stability`, `relations:X`, plus the actions injected.

### F1. "Ceasefire or Collapse": Ukraine, Winter 2026–27

- **Real-world hook:**
  - The Oleshky local ceasefire (2026-10-27/29) and the Abu Dhabi talks expected around 11-10 (https://www.khaleejtimes.com/europe/russia-ukraine-hold-peace-talks-nov-2026-ceasefire-oleshky).
  - Russia's 2026 offensive has stalled (https://www.criticalthreats.org/analysis/russian-offensive-campaign-assessment-october-16-2026).
  - The EU's €90bn loan, martial law until 2027-01-29, and Moscow's demand for all of Donetsk vs Kyiv's referendum condition (https://en.wikipedia.org/wiki/Peace_negotiations_in_the_Russian_invasion_of_Ukraine).
- **Playable:** UKR (primary), RUS, USA.
- **Length:** 10 turns of 1 month (Nov 2026 to Aug 2027).
- **Start state:** RUS→UKR war at frontline 55, exhaustion 60. Ukrainian grid at 50% capacity (a stability penalty each winter turn). USA–UKR relations 45.
- **Objectives:**
  - UKR: a ceasefire on current lines with a security guarantee (a GBR/FRA "reassurance force" alliance or a NATO-like pledge). Stability ≥ 40 and frontline ≤ 58 at signing.
  - RUS: a frontline ≥ 65, or a deal ceding all of Donetsk, before turn 10.
  - USA: any signed ceasefire before turn 8, without US troops on the ground and with USA–RUS ≥ -30.
- **Loss conditions:**
  - UKR: stability < 20, or Kyiv cedes Donetsk without a referendum (a coup or revolution risk).
  - RUS: exhaustion ≥ 90, or stability < 35.
  - Any side: nuclear use.
- **Decision cards:**
  1. *"The Free Economic Zone."* US mediators propose demilitarising unoccupied Donetsk as an internationally run zone.
     - (a) Accept in principle: relations:USA +15, approval -12, tension -6.
     - (b) Demand a referendum first: approval +5, relations:USA -10.
     - (c) Reject and launch a counteroffensive: frontline -3, exhaustion +10, tension +5.
  2. *"Blackout winter."* Russian strikes take out 40% of generation.
     - (a) Request emergency Patriot transfers: relations:USA +5, but the outcome depends on US approval.
     - (b) Long-range strikes on Russian refineries: RUS economy hit, tension +6, relations:USA -5 (Washington objects).
     - (c) Ration power and appeal to the EU: stability -6, relations:DEU/FRA +5.
  3. *"Coalition of the willing."* London and Paris offer a post-ceasefire reassurance force, conditional on a ceasefire.
     - (a) Accept: RUS red line triggered, tension +8, relations:RUS -10.
     - (b) Keep it in reserve: no effect.
  4. *"Minsk ghosts."* (RUS only) The Kremlin can propose a ceasefire that freezes the lines while it rearms.
     - Accepting raises the probability of a ceasefire but lowers Russian "prestige" (the score's prestige component).
- **Debrief:**
  - *What really happened:* by late 2026 the war had become attritional and drone-dominated. Russia gained under 1% of Ukraine in 2025 and almost nothing in 2026 at enormous cost. Diplomacy oscillated between US-drafted plans and Russian maximalism.
  - *What experts fear:* a ceasefire with no guarantees that becomes a rearmament pause, the "Minsk III" scenario. Or a collapse of Ukrainian manpower and grid resilience that turns stalemate into breakthrough.

### F2. "Hormuz Convoy": The Gulf, November 2026

- **Real-world hook:**
  - The IRGC attacked more than 24 ships in October 2026.
  - The US blockade has been in force since 2026-07.
  - Trump pledged no strikes before the midterms. Vance's letter to Mohsen Rezaei and Araghchi's "positive step" (10-31) came after the Qatari plan was rejected.
  - HEU believed to be in the Isfahan tunnels.
  - Sources: https://en.wikipedia.org/wiki/2026_Iran_war ; https://www.aljazeera.com/news/2026/8/18/no-talks-with-iran-says-trump-as-us-president-stews-over-hormuz-deal ; https://www.thenationalnews.com/news/europe/2026/03/10/irans-uranium-stockpile-likely-intact-in-isfahan-iaeas-grossi-says
- **Playable:** USA, IRN, ARE.
- **Length:** 12 turns of 1 week.
- **Start state:**
  - Wars USA→IRN at 60 and ISR→IRN at 58.
  - A new scenario variable, Hormuz traffic, at 45% of pre-war.
  - Oil shock active.
  - IRN nuclearProgress 55, with low-accuracy beliefs.
- **Objectives:**
  - USA: Hormuz traffic ≥ 80% for 3 consecutive turns, and either the HEU is handed over or verified (via a deal) or destroyed (strike success with ≥ 2 consecutive strikes), without a ground war.
  - IRN: the blockade is lifted and the regime survives (stability > 15) with no HEU surrender. A "TESTED" breakout is a pyrrhic win: global embargo plus a US/Israeli strike chain.
  - ARE: keep its own ports and air defences intact (damage below threshold) and end with relations with both the USA and IRN ≥ -50, the hedger's victory.
- **Loss conditions:**
  - A global economic shock: an oil price proxy above 150 for 3 turns.
  - Any nuclear use.
  - USA: approval < 30, the midterm backlash.
  - IRN: stability < 10, regime collapse.
- **Decision cards:**
  1. *"Tanker hit in the Strait."* A tanker strikes a mine.
     - (a) Expand convoy escorts: USA mobilisation +, Hormuz traffic +10, tension +3.
     - (b) Retaliatory strikes on IRGC Navy bases: tension +8, Iranian stability -5, risk of Gulf retaliation.
     - (c) Quiet signal via Oman: tension -4, approval -3 (US hawks).
  2. *"The Qatari text."* A ceasefire framework: blockade lifted in exchange for IAEA access.
     - (a) Accept: tension -10, relations:IRN +20, relations:ISR -15.
     - (b) Counter with "zero enrichment": relations:IRN -10.
     - (c) Walk away: tension +5.
  3. *"Isfahan's tunnels."* Intelligence suggests HEU is being moved.
     - (a) Bunker-buster strike: a nuclear-progress hit, tension +10, civilian-casualty outcry.
     - (b) A special-forces seizure raid: high risk and high reward.
     - (c) Rely on monitoring: Iran's progress drifts up.
  4. *"The midterm clock."* (USA only) Escalate before or after 11-03, with approval and tension trade-offs.
- **Debrief:**
  - *What really happened:* the 2026 Iran war killed a Supreme Leader but did not topple the regime. It closed and reopened Hormuz several times and turned into a blockade-versus-harassment stalemate. The IAEA lost all visibility.
  - *What experts fear:* a surviving hardline regime with about 200+ kg of 60% HEU and every incentive for a crash bomb program. Or a Gulf energy collapse that tips the world into recession.

### F3. "Quarantine": The Taiwan Strait

- **Real-world hook:**
  - Justice Mission-2025 rehearsed a blockade of Keelung and Kaohsiung (https://focustaiwan.tw/politics/202512300008).
  - Taiwan's opposition legislature halved the special defence budget (https://focustaiwan.tw/politics/202604280021).
  - After the 2026-05 Beijing summit Trump warned Taipei against independence (https://theonlinecitizen.com/2026/05/16/trump-warns-taiwan-against-independence-after-beijing-summit-with-xi-jinping).
  - Japan's Takaichi treats a Taiwan contingency as "survival-threatening".
  - The purge of the Central Military Commission raises questions about PLA readiness and command.
- **Playable:** TWN (primary), CHN, USA.
- **Length:** 12 turns of 1 week. Turn 1 is just after the 2026-11-28 local elections.
- **Start state:**
  - Under a "customs inspection" regime, the China Coast Guard begins boarding ships bound for Taiwan. This is not yet a naval blockade.
  - LNG reserves are about 11 days, a new resource track.
  - CHN–TWN relations -80. USA–TWN relations 55. JPN–TWN relations 65.
- **Objectives:**
  - TWN: keep energy imports above the survival threshold for 12 turns without firing first. Keep US and Japanese support (relations ≥ 50), and pass an emergency defence budget.
  - CHN: get Taipei to accept the inspections, or open cross-strait talks with a KMT-led legislature, without US intervention or kinetic war.
  - USA: restore unimpeded shipping without a shooting war with China.
- **Loss conditions:**
  - TWN: energy reserves at 0 for 2 turns (forced capitulation), or a "first shot" that triggers war.
  - CHN: a US–Japan joint escort convoy succeeds 3 times (humiliation), or a war starts.
  - All sides: nuclear signalling past threshold.
- **Decision cards:**
  1. *"Boarding at Penghu."* The China Coast Guard boards a Taiwanese LNG tanker.
     - (a) Escort with the navy: tension +8, risk of a clash.
     - (b) Comply under protest: energy +, approval -10, relations:CHN +5.
     - (c) Reflag tankers to the US/Japan: relations:USA -5 or +10, depending on whether Washington agrees.
  2. *"Article 9 moment."* Ask Tokyo to declare a "survival-threatening situation".
     - Success: relations:JPN +10, CHN–JPN -20, tension +10.
     - Refusal: approval -5.
  3. *"Emergency budget."* Push special defence funding past the opposition legislature.
     - Pass: stability -5, relations:USA +10.
     - Fail: the KMT gains leverage.
  4. *"Washington's ambiguity."* (USA only) Declare escort operations, offer a deal on trade, or demand Taipei disavow independence. Each moves China and Taiwan relations in opposite directions.
- **Debrief:**
  - *What really happened (to 2026):* blockade drills grew more realistic every year, while Taiwan's own politics stalled its defence budget. US policy oscillated between arms sales and summit deals.
  - *What experts fear:* a gray-zone "quarantine" that is legally deniable and never crosses the line into war, but strangles an island that imports 97% of its energy.

### F4. "Caracas After Maduro": Venezuela and Cuba, 2027

- **Real-world hook:**
  - The 2026-01-03 US capture of Maduro.
  - Acting President Rodríguez, who has cut oil deals with Washington and promised elections with no date.
  - Machado sidelined; the Cuban grid collapsing under the oil blockade.
  - Sources: https://en.wikipedia.org/wiki/2026_in_Venezuela ; https://en.wikipedia.org/wiki/2026_in_Cuba ; https://www.pbs.org/newshour/world/who-is-delcy-rodriguez-venezuelas-interim-president-after-maduros-ouster
- **Playable:** VEN (primary), CUB, USA.
- **Length:** 12 turns of 1 month.
- **Start state:**
  - VEN stability 35 and legitimacy 25. USA–VEN relations 20.
  - CUB stability 28, embargoed by the USA.
  - Oil output index 60.
- **Objectives:**
  - VEN: survive 12 turns. No coup by the security chiefs, US sanctions relief maintained, oil output ≥ 80. Then hold elections you win (legitimacy ≥ 50) or postpone them without US rupture.
  - CUB: keep the Party in power with stability ≥ 20 through reform and foreign oil.
  - USA: a credible election date in Venezuela and a reform or transition in Cuba, without a military intervention.
- **Loss conditions:**
  - VEN: a coup (stability < 15 with a high military power center), or a full US re-embargo.
  - CUB: revolution.
- **Decision cards:**
  1. *"Machado comes home."*
     - (a) Arrest her: relations:USA -30, legitimacy -10.
     - (b) Allow a rally: stability -8, legitimacy +10.
     - (c) Offer her a ministry: legitimacy +15, hardliners raise coup risk.
  2. *"The 65 billion barrels."* Washington wants long-term reserve rights.
     - (a) Sign: GDP growth +, relations:USA +20, approval -10 (sovereignty).
     - (b) Haggle: relations:USA -5.
     - (c) Court China: relations:CHN +15, relations:USA -25.
  3. *"Havana's SOS."* (VEN) Cuba begs for oil.
     - (a) Send it secretly: relations:CUB +20, relations:USA -20 if discovered.
     - (b) Refuse: relations:CUB -20.
  4. *"Generals' amnesty."* The security chiefs demand guarantees against extradition.
     - Grant: coup risk down, relations:USA -10.
     - Refuse: coup risk up.
- **Debrief:**
  - *What really happened:* a decapitation without regime change. The chavista state survived its leader's capture by making itself useful to Washington on oil and migration.
  - *What experts fear:* "authoritarian transition without democracy" in Caracas. And a humanitarian collapse and exodus from Cuba.

### F5. "Bab al-Mandab Burning": The Red Sea, 2026–27

- **Real-world hook:**
  - The September 2026 Houthi offensive took Mokha and reportedly Perim (https://euronews.com/2026/09/10/houthis-seize-red-sea-port-city-in-push-to-seize-bab-el-mandeb).
  - The Saudi/PLC counteroffensive began 2026-10-04, and the Houthis struck Riyadh's airport on 10-10.
  - The STC fractured and the Saudi–UAE rift deepened (https://wtop.com/world/2026/01/yemens-southern-transitional-council-to-dismantle-a-day-after-its-leader-fled-to-the-uae/).
  - Egypt's Suez revenue has collapsed.
- **Playable:** SAU (primary), YEM, ARE.
- **Length:** 10 turns of 1 month.
- **Start state:** war YEM→SAU at frontline 55. A Red Sea shipping index at 30%. EGY stability penalty. SAU–ARE relations 10.
- **Objectives:**
  - SAU: retake the strait coast (frontline ≤ 40) or reach a settlement in which the Houthis stop cross-border strikes. Keep Vision 2030 alive: GDP growth ≥ 0.
  - YEM: a settlement that pays public salaries and recognises Houthi control, or holds Perim for 10 turns.
  - ARE: secure southern ports and influence without open conflict with Saudi Arabia.
- **Loss conditions:**
  - SAU: 3 or more major infrastructure hits in a row (a stability collapse), or open war with the UAE.
  - YEM: the frontline reaches 20.
- **Decision cards:**
  1. *"Riyadh airport struck."*
     - (a) Massive air campaign on Sanaa: tension +6, international outcry.
     - (b) Back-channel via Oman: tension -5, approval -5.
     - (c) Invite US and Israeli strikes: relations:IRN -15, Houthi morale down.
  2. *"The southern question."* The STC remnants ask the UAE for help.
     - (a) Saudi Arabia absorbs the southern forces: SAU–ARE -10.
     - (b) Share the south with the UAE: SAU–ARE +15, PLC stability -.
  3. *"Iran's offer."* Tehran offers to rein in the Houthis in exchange for Saudi neutrality in the Iran war.
     - Accept: relations:USA -15, tension -8.
- **Debrief:**
  - *What really happened:* the Iran war turned the Houthis from a shipping nuisance into a force contesting the strait itself.
  - *What experts fear:* a permanent chokepoint closure that, together with Hormuz, cuts both of the Gulf's sea exits.

### F6. "Scarborough Line": The South China Sea

- **Real-world hook:**
  - The 2026-06-20 warship standoff and the 2026-07-23/24 water-cannon attacks at Scarborough (https://www.thejakartapost.com/world/2026/07/23/china-fires-water-cannon-on-philippine-ship-at-scarborough-shoal-manila-says).
  - Rubio reaffirmed the US–Philippine Mutual Defense Treaty.
  - Sara Duterte's Senate trial (https://www.arabnews.com/node/2649796/world), and Rodrigo Duterte at the ICC.
- **Playable:** PHL (primary), CHN.
- **Length:** 10 turns of 1 month.
- **Start state:**
  - A Filipino sailor is killed in a ramming incident, and China begins land reclamation at Scarborough Shoal.
  - CHN–PHL relations -65. USA–PHL 75.
  - The Philippines' internal "Marcos vs Duterte" division has tension 70.
- **Objectives:**
  - PHL: get a public US statement that the treaty covers the incident and halt the reclamation (CHN de-escalates) within 10 turns, while keeping stability ≥ 45 through the Duterte trial.
  - CHN: consolidate the reclamation without triggering US treaty action, and split Manila (the pro-China Duterte camp gains).
- **Loss conditions:** a PHL–CHN shooting war, or a Philippine government collapse.
- **Decision cards:**
  1. *"Invoke the treaty."* Request formal consultations under Article IV.
     - US agrees: tension +8, relations:CHN -15.
     - US hedges: approval -10.
  2. *"Second arbitration."* File a new case under the Law of the Sea convention (UNCLOS): prestige +, relations:CHN -10, slow effect.
  3. *"Joint patrol."* Patrol with JPN/AUS: relations:JPN +10, tension +4.
  4. *"Back-channel to Beijing."* Tension -6, relations:CHN +10, the Duterte camp's narrative boosted, relations:USA -5.
- **Debrief:**
  - *What really happened:* a decade of gray-zone escalation (water cannon, lasers, rammings) stopped just short of lethal force.
  - *What experts fear:* the first death that forces Washington to clarify whether the treaty applies, the trigger for a US–China clash outside Taiwan.

### F7. "Water War": India and Pakistan

- **Real-world hook:**
  - The Indus Waters Treaty has been in abeyance since 2025-04, after Pahalgam.
  - Operation Sindoor (2025-05-07/10) was the first drone and missile exchange between nuclear powers [bk].
  - In 2026 India moved to restrict the western rivers and Pakistan said diversion is war (https://www.isas.nus.edu.sg/papers/the-indus-waters-treaty-india-pakistan-tensions-persist/ ; https://tribune.com.pk/story/2612412/).
  - Pakistan has a new Chief of Defence Forces, Field Marshal Munir (https://www.arabnews.pk/node/2622517), and a Saudi defence pact.
- **Playable:** IND, PAK.
- **Length:** 8 turns of 1 week.
- **Start state:**
  - A mass-casualty attack in Jammu kills 30. India blames a Pakistan-based group.
  - IND–PAK relations -85, with 100k troops deployed on each side.
  - Pakistan is fighting Afghanistan in the west (the PAK→AFG war is active).
- **Objectives:**
  - IND: "restore deterrence". Inflict a visible punitive cost on Pakistan, end with frontline/prestige gains, and stay below the nuclear threshold. Accept a ceasefire within 8 turns with the US/Gulf brokering seen as "on India's terms" (relations:USA ≥ 25).
  - PAK: deter Indian escalation and restore water flows (the treaty reinstated or a mediation track), without a two-front collapse.
- **Loss conditions:** any nuclear use (for both: game over); stability < 25.
- **Decision cards:**
  1. *"Close the gates."* (IND) Divert western-river flows during the sowing season.
     - PAK red line triggered, tension +12, relations:CHN -10.
  2. *"Strike the camps."* (IND)
     - (a) Limited standoff missile strikes: tension +10.
     - (b) Strikes on military airbases: tension +18, a PAK retaliation card.
     - (c) Covert action only: lower tension.
  3. *"Full spectrum deterrence."* (PAK) Signal tactical nuclear readiness.
     - Tension +20, relations:USA -10, but India's warPropensity falls.
  4. *"Riyadh calls."* The Saudi pact and US mediation offer a ceasefire.
     - Accept: tension -12. The prestige effect depends on timing.
- **Debrief:**
  - *What really happened:* in May 2025 two nuclear states exchanged missile and drone strikes for four days, and outside powers brokered the stop.
  - *What experts fear:* a water dispute that turns a recurring terror-and-retaliation cycle into a permanent existential grievance, with a far shorter fuse each time.

### F8. "Fire on the Nile": Sudan, the Siege of El Obeid

- **Real-world hook:**
  - El Fasher fell on 2025-10-26, and El Obeid has been besieged since 2026-07 (https://www.aljazeera.com/news/2026/7/6/el-obeid-under-siege-by-rsf-could-this-be-sudans-next-el-fasher).
  - The RSF's parallel government and central bank, and the Quad truce that never held (https://en.wikipedia.org/wiki/2026_in_Sudan).
  - Foreign patrons: the UAE, Egypt and Turkey.
  - Ethiopia's Tigray war resumed in 2026-09, with Eritrean troops reported (https://tribune.com.pk/story/2633644/eritrean-troops-deployed-in-ethiopias-tigray-region).
- **Playable:** SDN.
- **Length:** 10 turns of 1 month.
- **Start state:**
  - SDN stability 12, insurgency GUERILLA (the RSF), with internal division tension 95.
  - SDN–ARE relations -70. SDN–EGY 40. SDN–ETH -45.
  - Famine track active.
- **Objectives:** hold El Obeid and the Kordofan corridor (insurgency ≤ REBELLION by turn 10), reduce RSF foreign supply, and avoid a famine collapse (stability ≥ 15).
- **Loss conditions:** El Obeid falls (stability < 8), a foreign power recognises the RSF government, or a coup within the army.
- **Decision cards:**
  1. *"The Quad truce."*
     - (a) Accept a humanitarian truce: stability +5, partition risk up, relations:USA/SAU +10.
     - (b) Reject it and fight on: tension +3, famine track worsens.
  2. *"A port for arms."* Russia offers drones for a naval base on the Red Sea.
     - Accept: relations:RUS +20, relations:USA -20, SAU/EGY wary.
  3. *"Confront Abu Dhabi."* Sue the UAE at the ICJ or raise it at the UN: prestige +, relations:ARE -10. Or make a quiet deal: RSF supply down, legitimacy -10.
  4. *"Egyptian air cover."* Accept covert Egyptian strikes near the border: frontline gains, relations:ETH -10, risk of regional war.
- **Debrief:**
  - *What really happened:* a war between two generals became the world's largest displacement and hunger crisis. It was fuelled by gold, Gulf money and drones.
  - *What experts fear:* a Libya-style permanent east–west partition, and spillover into a Horn of Africa war involving Ethiopia, Eritrea and Egypt.

### Reserve flashpoints (one-liners)

- **"Greenland Gambit"** (DNK/USA, 8 monthly turns).
  - Hook: the January 2026 tariff threat on 8 allies, the Davos framework, and US talks on 3 more bases (https://www.aljazeera.com/news/2026/1/22/trumps-greenland-framework-deal-what-we-know-about-it-what-we-dont).
  - Needs the GRL map alias.
- **"The Day After"** (ISR's next PM, PSX or LBN, 10 turns).
  - Hook: the ISF at about 1% strength, Hamas undisarmed, Israel holding 64% of Gaza, the Lebanon framework of 2026-06-26, and a hung Knesset.
- **"Eastern Sentry"** (POL/RUS/BLR, 8 weekly turns).
  - Hook: the September 2025 drone incursion, Article 4, and Oreshnik in Belarus.
- **"Red Sea Gambit"** (ETH, 10 monthly turns).
  - Hook: Abiy's push for sea access and Assab, Eritrean troops in Tigray, and the renewed TPLF war.

---

## G. Engine and schema gaps found during the review

1. **No supplier `CHN`** (also TUR, ISR) in `SupplierIdSchema`. This misrepresents PAK, IRN, ETH, VEN, SDN, ARE and AFG.
2. **The scenario schema cannot set** `embargoedBy`, `underGlobalEmbargo`, `borderDeployments`, war `exhaustion` or per-scenario `goals`/`personality` deltas. Era-specific behaviour (for example, a "Trump-era USA") is therefore impossible without editing base profiles. Add `CountryOverrideSchema.embargoedBy`, a `personality` partial, `goals` replacement, and `startingWars[].exhaustion`.
3. **There is no non-state actor or rival-government model.** The RSF, Hamas, Hezbollah, the PLC and STC, and the TPLF are all squeezed into `internalDivisions` and `insurgencyLevel`. Consider a lightweight "faction" entity for flashpoints.
4. **No hosted nuclear weapons** (BLR and the NATO sharing states) and no "HEU stockpile" separate from progress. Iran's situation in 2026 (a damaged program with an intact stockpile) is hard to model with a single `progress` number.
5. **No chokepoint and shipping state.** Hormuz, Bab al-Mandab, the Taiwan Strait and Suez are central to the 2026 world. A small `chokepoints` map in WorldState would unlock F2, F3 and F5.
6. **`militaryBudgetPct` is capped at 20.** Wartime Ukraine is about 26–30%.
7. **Turn length is fixed at one month**, but the flashpoints need weekly turns. Add `turnLengthDays` to the scenario and scale the monthly rates (economy, score drift, tension decay).
8. **`TIER1_COUNTRIES`** must be extended for the new countries to be playable.
9. **Map join codes:** Palestine `PSX` vs ISO `PSE`; Greenland `GRL` is separate from `DNK`.
