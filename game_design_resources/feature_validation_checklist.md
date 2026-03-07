# Feature Validation Checklist
## Cross-referencing all game design resources against spec.md

### Legend
- ✅ = In spec, properly addressed
- ⚠️ = In spec but incomplete/needs enhancement
- ❌ = MISSING from spec - needs to be added
- 🔄 = Marked as Phase 2/3

---

## 1. NARRATIVE & ONBOARDING (Game Design Spec + Required Features)

| Feature | Design Doc Reference | Spec Status | Notes |
|---------|---------------------|-------------|-------|
| Opening splash with poem "Sweet Bird of Truth" | Game Design Spec 1.0 | ❌ MISSING | High impact - sets tone |
| Starting year selection (1950-2025) | Required Features 3.1 | ✅ Spec 4.2 | |
| Auto-fabricated leadership backstory | Game Design Spec 1.0, Required Features 3.2 | ✅ Spec 4.2, 10.4 | |
| Initial legitimacy based on rise-to-power | Required Features 3.2 | ⚠️ Mentioned but not detailed | Need mechanics |
| Initial faction support levels | Required Features 3.2 | ❌ MISSING | Affects early gameplay |
| Public expectations (reformist vs stability mandate) | Required Features 3.2 | ❌ MISSING | Affects scoring |

---

## 2. TURN STRUCTURE & FLOW (Original Conflict + Game Design Spec)

| Feature | Design Doc Reference | Spec Status | Notes |
|---------|---------------------|-------------|-------|
| Monthly turns (1 month = 1 turn) | All docs | ✅ Spec 2.1 | |
| Newspaper at turn START | Original Conflict 4.0 | ✅ Spec 4.1 | |
| Linear phase progression (no going back) | Original Conflict 4.0 | ✅ Spec 4.1 | |
| News → Briefing → Diplomacy → Military → Domestic → Confirm | Game Design Spec 2.0 | ✅ Spec 4.1 | |
| Annual UN Summit (every 12 turns) | Original Conflict 3.0, Game Design Spec 4.0 | ❌ MISSING | High impact - budget/aid review |
| July Global Summit for embargo reviews | Game Design Spec 4.0 | ❌ MISSING | Nuclear/Palestinian issues |

---

## 3. DIPLOMACY SYSTEM (Game Design Spec + Original Conflict)

| Feature | Design Doc Reference | Spec Status | Notes |
|---------|---------------------|-------------|-------|
| 7-level relationship hierarchy | Game Design Spec 3.0 | ✅ Spec 8.1 | |
| Diplomatic stances (Improve/Maintain/Worsen) | Game Design Spec 3.0 | ✅ Spec 8.1 | |
| Diplomatic action costs ($100M/month) | Game Design Spec 3.0 | ✅ Spec 8.1 | |
| Military Pact request (requires "Profitable") | Original Conflict 5.0 | ⚠️ Implied but not explicit | Need threshold |
| Alliance auto-war declaration | Original Conflict 8.0 | ✅ Spec 8.1 | |
| Border troop deployment degrades relations | Original Conflict 8.0 | ❌ MISSING | Dynamic diplomacy |
| "Attack Means Disaster" nuclear state | Game Design Spec 3.0 | ✅ Spec 8.1 | |

---

## 4. ESPIONAGE & COVERT OPERATIONS (Game Design Spec + Original Conflict)

| Feature | Design Doc Reference | Spec Status | Notes |
|---------|---------------------|-------------|-------|
| Government Stability rating (Very Solid → Collapsing) | Game Design Spec 3.0 | ⚠️ Numeric only | Need named levels |
| Insurgency Level (None → Guerilla Force) | Game Design Spec 3.0 | ✅ Spec 8.6 | |
| Destabilize target | Game Design Spec 3.0 | ✅ Spec 8.5 | |
| Support/suppress insurgents | Game Design Spec 3.0 | ✅ Spec 8.5 | |
| Assassination attempts (if target "Weak") | Game Design Spec 3.0 | ✅ Spec 8.5 | |
| Coup attempts (if target has "Guerilla Force") | Game Design Spec 3.0 | ✅ Spec 8.5 | |
| Soft vs Hard policing toggle | Game Design Spec 3.0, Original Conflict 5.0 | ✅ Spec 8.6 | |
| Hard tactics damage US relations | Original Conflict 8.0 | ✅ Spec 8.6 | |
| Hard tactics reduce US aid | Original Conflict 8.0 | ⚠️ Mentioned but not quantified | Need specific % |

---

## 5. MILITARY & PROCUREMENT (Game Design Spec + Original Conflict)

| Feature | Design Doc Reference | Spec Status | Notes |
|---------|---------------------|-------------|-------|
| Defense budget as "hostility indicator" | Game Design Spec 4.0 | ❌ MISSING | Peace ~$100M, War $300M+ |
| Auto-budget increase on neighbor aggression | Game Design Spec 4.0 | ❌ MISSING | Reactive system |
| Arms suppliers (USA, UK, France, Private Dealer) | Game Design Spec 4.0 | ✅ Spec 8.7 | |
| Supplier relationship requirements | Game Design Spec 4.0 | ✅ Spec 8.7 | |
| Consistent purchasing unlocks high-tier gear | Original Conflict 5.0 | ✅ Spec 8.7 | |
| Specific unit types (tanks, helicopters, SAMs, fighters) | Original Conflict 5.0 | ⚠️ Generic "procurement" | Need unit types |
| Pre-war precision airstrikes | Original Conflict 5.0 | ❌ MISSING | Military/civilian/industrial/nuclear targets |
| Troop mobilization to borders | Original Conflict 5.0 | ⚠️ Generic mobilization | Need border-specific |
| Rock-paper-scissors unit combat | Original Conflict 4.0 | ❌ MISSING | Combat resolution |

---

## 6. NUCLEAR SYSTEM (Game Design Spec + Original Conflict)

| Feature | Design Doc Reference | Spec Status | Notes |
|---------|---------------------|-------------|-------|
| Nuclear research funding ($20M/month) | Original Conflict 5.0 | ✅ Spec 8.8 | |
| Two-Strike Rule | Game Design Spec 4.0 | ✅ Spec 8.8 | |
| Mushroom Cloud icon after testing | Original Conflict 7.0 | ⚠️ Mentioned but not visual spec | Need UI detail |
| Nuclear strike option during war | Original Conflict 5.0 | ✅ Spec 8.8 | |
| Global Holocaust loss condition | Game Design Spec 4.0 | ✅ Spec 8.8 | |
| UN arms embargo after nuke use | Original Conflict 8.0 | ✅ Spec 8.8 | |

---

## 7. INTERNAL AFFAIRS (Original Conflict + Required Features)

| Feature | Design Doc Reference | Spec Status | Notes |
|---------|---------------------|-------------|-------|
| "Palestinian Problem" / regional insurgency management | Original Conflict 5.0 | ⚠️ Generic insurgency | Need specific regional issues |
| Policing brigades deployment | Original Conflict 5.0 | ❌ MISSING | Specific mechanic |
| Assassination/impeachment risk | Original Conflict 2.0 | ⚠️ Stability collapse only | Need specific triggers |
| Public insecurity triggers | Original Conflict 2.0 | ❌ MISSING | Deposition mechanic |
| Corruption scandals (random events) | Required Features 6.2 | ✅ Spec 8.6 | |

---

## 8. SCORING & END-GAME (Game Design Spec + Required Features)

| Feature | Design Doc Reference | Spec Status | Notes |
|---------|---------------------|-------------|-------|
| 0-200 point scale | Game Design Spec 2.0 | ⚠️ Have scoring but different scale | Verify alignment |
| Economic Performance (0-50) | Game Design Spec 2.0 | ✅ Spec has economy component | |
| Security & Stability (0-50) | Game Design Spec 2.0 | ✅ Spec has security component | |
| Internal Approval (0-50) | Game Design Spec 2.0 | ✅ Spec has stability component | |
| World Prestige (0-50) | Game Design Spec 2.0 | ⚠️ Not explicit in scoring | Need prestige tracking |
| Timeline of major events | Required Features 8.2 | ⚠️ TurnLog exists but not formatted | Need report format |
| Policy summary | Required Features 8.2 | ❌ MISSING | High-level policy direction |
| Historical comparisons | Required Features 8.2 | ❌ MISSING | vs typical leaders |
| Leadership style classification | Required Features 8.2 | ✅ Spec 10.4 | |
| Charts (approval, GDP, military) | Required Features 8.2 | ❌ MISSING | Visual report |
| Exportable report (JSON/HTML/PDF) | Required Features 8.3 | ⚠️ JSON only | Need HTML/PDF |
| Narrative history ("political biography") | Required Features 8.3 | ❌ MISSING | LLM-generated |

---

## 9. MAP & VISUALIZATION (Required Features + Original Conflict)

| Feature | Design Doc Reference | Spec Status | Notes |
|---------|---------------------|-------------|-------|
| 2D pan/zoom map | Required Features 9.1 | ✅ Spec 12.1 | |
| Military layer (forces, alliances, conflict zones) | Required Features 9.2 | ✅ Spec 12.1 | |
| Economic layer (GDP gradient, trade flows) | Required Features 9.2 | ✅ Spec 12.1 | |
| Resources layer (oil, mines, infrastructure) | Required Features 9.2 | ❌ MISSING | Strategic resources |
| Political layer (regime type, protests) | Required Features 9.2 | ✅ Spec 12.1 | |
| Fog-of-information based on intel | Required Features 9.3 | ✅ Spec 12.1 | |
| Uncertainty visualization (fuzzy edges) | Required Features 9.2 | ⚠️ Mentioned but not detailed | Need visual spec |
| War progress bar | Original Conflict 7.0 | ✅ Spec 9.4 | |
| Mushroom cloud icon on map | Original Conflict 7.0 | ❌ MISSING | Nuclear visual |
| Border troop indicators | Original Conflict 6.0 | ❌ MISSING | Deployed troops visual |
| Relationship status icons (WAR, PACT) | Original Conflict 6.0 | ⚠️ In legend but not on map | Need map icons |

---

## 10. ADVISOR SYSTEM (Game Design Spec + Required Features)

| Feature | Design Doc Reference | Spec Status | Notes |
|---------|---------------------|-------------|-------|
| Chat-driven decision support | Game Design Spec 2.0 | ✅ Spec 9.5 | |
| Departmental bias | Game Design Spec 2.0 | ✅ Spec 9.5 | |
| Foreign Minister | Required Features 4.2 | ✅ Implemented | |
| Defense Minister | Required Features 4.2 | ✅ Implemented | |
| Intelligence Chief | Required Features 4.2 | ✅ Implemented | |
| Treasury/Finance Minister | Required Features 4.2 | ✅ Implemented | |
| Interior Minister | Required Features 4.2 | ❌ MISSING | Internal affairs |
| Military chiefs | Required Features 4.2 | ❌ MISSING | Separate from Defense |
| Central bank governor | Required Features 4.2 | ❌ MISSING | Economic policy |
| Political allies/opposition | Required Features 4.2 | ❌ MISSING | Domestic politics |
| Foreign counterparts (diplomatic channels) | Required Features 4.2 | ❌ MISSING | Direct diplomacy |
| Advisors see only departmental belief state | Required Features 4.2 | ✅ Spec 9.5 | |

---

## 11. COUNTRY AGENT BEHAVIOR (Required Features)

| Feature | Design Doc Reference | Spec Status | Notes |
|---------|---------------------|-------------|-------|
| Respect institutional constraints | Required Features 5.2 | ✅ Spec 10.2 | |
| React to fictional events plausibly | Required Features 5.2 | ✅ Spec 10.1 | |
| Maintain national "character" | Required Features 5.2 | ✅ Spec 10.1 | |
| Long-term objectives | Required Features 5.1 | ✅ Goals system | |
| Short-term pressures (elections, protests) | Required Features 5.1 | ⚠️ Partial | Need election pressure |
| Hawkish/dovish leadership style | Required Features 5.1 | ❌ MISSING | Leadership personality |

---

## 12. ASYMMETRIC INFORMATION (Required Features)

| Feature | Design Doc Reference | Spec Status | Notes |
|---------|---------------------|-------------|-------|
| Ground Truth vs Belief State | Required Features 6.1 | ✅ Spec 6.2, 6.3 | |
| Belief state can be outdated | Required Features 6.1 | ⚠️ Implied but not explicit | Need staleness mechanic |
| Belief state can be incomplete | Required Features 6.1 | ✅ Intel level affects | |
| Belief state can be incorrect (misinformation) | Required Features 6.1 | ❌ MISSING | Deception operations |
| Intelligence budget affects accuracy | Required Features 6.2 | ✅ Spec 8.5 | |
| Shared intelligence with allies | Required Features 6.2 | ✅ Spec 8.1 | |
| Public leaks/whistleblowers | Required Features 6.2 | ❌ MISSING | Random reveals |
| Misinformation operations | Required Features 6.3 | ❌ MISSING | Fake military buildups |
| Uncertainty ranges ("GDP likely between X and Y") | Required Features 6.3 | ⚠️ Mentioned but not implemented | Need UI |

---

## SUMMARY OF MISSING HIGH-IMPACT FEATURES

### CRITICAL (Must add to spec)
1. **Opening splash screen with poem** - Sets tone, easy to implement
2. **Annual UN Summit (every 12 turns)** - Budget review, aid, Palestinian issues
3. **July Global Summit** - Embargo reviews, nuclear negotiations
4. **Defense budget as hostility indicator** - Auto-increase on aggression
5. **Pre-war precision airstrikes** - Target selection (military/civilian/industrial/nuclear)
6. **Border troop deployment mechanics** - Specific border targeting
7. **Resources map layer** - Oil, gas, minerals, infrastructure
8. **Misinformation/deception operations** - Fake buildups, propaganda
9. **Public leaks/whistleblowers events** - Random information reveals
10. **Leadership style (hawkish/dovish)** - Affects AI behavior

### IMPORTANT (Should add)
11. Initial faction support levels
12. Public expectations (reformist vs stability mandate)
13. Named stability levels (Very Solid → Collapsing)
14. Specific unit types for procurement
15. Rock-paper-scissors combat resolution
16. Mushroom cloud icon on map
17. Border troop indicators on map
18. Additional advisors (Interior, Military Chiefs, Central Bank, Opposition)
19. Foreign counterpart direct diplomacy
20. Belief state staleness mechanic
21. Policy summary in end-game report
22. Charts in end-game report
23. Narrative history export
