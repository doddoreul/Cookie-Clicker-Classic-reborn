# 🍪 Cookie Clicker Classic — Reborn — Documentation

Complete gameplay documentation for **Cookie Clicker Classic — Reborn** (v0.139). This document covers every system in the game: clicking, buildings, upgrades, Golden Cookies, achievements, the Grandmapocalypse, Elder Pledge, prestige, offline progress, and the save system.

---

## Table of contents

1. [Overview](#1-overview)
2. [How to play](#2-how-to-play)
3. [Number formatting](#3-number-formatting)
4. [Clicking & Cursors](#4-clicking--cursors)
5. [Buildings](#5-buildings)
6. [Upgrades](#6-upgrades)
7. [Golden Cookies](#7-golden-cookies)
8. [Grandmapocalypse](#8-grandmapocalypse)
9. [Elder Pledge](#9-elder-pledge)
10. [Achievements](#10-achievements)
11. [Prestige](#11-prestige)
12. [Offline & idle](#12-offline--idle)
13. [Save system & settings](#13-save-system--settings)
14. [UI & shortcuts](#14-ui--shortcuts)
15. [Project structure](#15-project-structure)

---

## 1. Overview

**Cookie Clicker Classic — Reborn** is a fan-made, expanded re-implementation of
*Orteil's classic Cookie Clicker Classic*. You click the big cookie to earn
cookies, buy buildings that produce cookies automatically, purchase upgrades,
click Golden Cookies for temporary boosts, and eventually reset your run for
**prestige points** that multiply all future production.

Everything is stored locally in your browser. No servers, no accounts, no ads.

---

## 2. How to play

1. **Click the big cookie** — every click earns cookies.
2. **Buy buildings** — each building produces cookies every second on its own.
3. **Buy upgrades** — upgrades multiply the production of the building they
   belong to (and sometimes interact with other systems).
4. **Click Golden Cookies** — temporary buffs (Frenzy, Click Frenzy, …).
5. **Reset** — once you have a lot of total cookies baked, reset the run to
   earn prestige and start over faster.

### The core loop

```
click → cookies → buildings → more cookies/sec → upgrades → cookies/sec² → …
```

The amount of cookies your kitchen produces per second is called **CpS**
(*Cookies per Second*). Almost every decision in the game comes down to
*"does this make my CpS higher faster than the alternative?"*

---

## 3. Number formatting

Large numbers are displayed with **scientific-style suffixes**:

| Suffix | Value       | Suffix | Value       |
| ------ | ----------- | ------ | ----------- |
| M      | 1 000 000   | Sx     | 10²¹        |
| B      | 10⁹         | Sp     | 10²⁴        |
| T      | 10¹²        | Oc     | 10²⁷        |
| Qa     | 10¹⁵        | No     | 10³⁰        |
| Qi     | 10¹⁸        | Dc     | 10³³        |

…and so on up to **VgVgVg** (`centillion`, 10³⁰³). Below one million, numbers
are shown with thousands separators (spaces).

Examples: `1 234`, `1.234M`, `45.67B`, `8.9Sx`, `123No`.

---

## 4. Clicking & Cursors

### Manual clicks

Every click on the big cookie grants:

```
click gain = cursorGain × clickMultiplier × prestigeMultiplier
```

- `cursorGain` = `1` normally, or `ceil(cursorCount × 1.5)` while an **Elder
  Pledge** is active (grandmas are calmed → they help you click).
- `clickMultiplier` = **×777 during Click Frenzy**, ×1 otherwise.
- `prestigeMultiplier` = `1 + prestige × powerRatio` (see [Prestige](#11-prestige)).

### Cursors (autoclicker building)

Cursors are special: they **auto-click** for you. With `N` cursors, the game
auto-clicks every `max(1, ceil(150/N))` ticks, producing cookies each time.

Cursor auto-production is boosted by Golden Cookie production multipliers, the
global (kitten/prestige) multipliers, and reduced by the Grandmapocalypse malus.

---

## 5. Buildings

There are **12 buildings**. Each has a **base price**, a **base gain**, and its
own upgrade ladder. Building prices scale with the classic formula:

```
price(N) = ceil(basePrice × 1.15^N)     (N = number already owned)
```

So each building is 15% more expensive each time you buy one (bulk **×10** and
**×100** buttons compute the exact sum of the next 10 / 100 purchases).

Per-building base gain is expressed in cookies per **5 seconds**; the real
**CpS contribution is `gain / 5`** per building.

| Building        | Base price | Gain (/5s) | CpS / unit | Description |
| --------------- | ---------- | ---------- | ---------- | ----------- |
| 🖱️ **Cursor**   | 15         | 0.5        | *autoclick* | Autoclicks every 5 seconds. |
| 👵 **Grandma**   | 100        | 5          | 1          | A nice grandma to bake more cookies. |
| 🌱 **Farm**      | 500        | 40         | 8          | Grows cookie plants from cookie seeds. |
| ⛏️ **Mine**      | 4 000      | 235        | 47         | Mines out cookie dough and chocolate chips. |
| 🏭 **Factory**   | 32 000     | 1 300      | 260        | Produces large quantities of cookies. |
| 🏦 **Bank**      | 280 000    | 7 000      | 1 400      | Generates cookies from interest. |
| 🛕 **Temple**    | 1 900 000  | 39 000     | 7 800      | Full of precious, ancient chocolate. |
| 🧙 **Wizard tower** | 15 000 000 | 220 000  | 44 000     | Summons cookies with magic spells. |
| 🚀 **Shipment**  | 130 000 000 | 1 300 000 | 260 000  | Brings in fresh cookies from the cookie planet. |
| ⚗️ **Alchemy lab** | 1 300 000 000 | 8 000 000 | 1 600 000 | Turns gold into cookies! |
| 🌀 **Portal**    | 9 000 000 000 | 50 000 000 | 10 000 000 | Opens a door to the Cookieverse. |
| ⏳ **Time machine** | 70 000 000 000 | 325 000 000 | 65 000 000 | Brings cookies from the past. |

A building's total production is:

```
building CpS = count × baseGain/5 × buildingMult × synergyMult
               × goldenCookieCpsMult × buildingSpecialMult
               × globalMult × angerMult
```

### Visuals

On-screen, each owned building is drawn on the map. Grandmas are special: as
you buy more types of buildings, random grandmas take on themed looks
(golden, factory, mine, shipment, portal, time, farm, bank, temple, wizard,
pledged), and they are the centerpiece of the [Grandmapocalypse](#8-grandmapocalypse).

---

## 6. Upgrades

There are **189 upgrades** (excluding Elder Pledge). They are unlockable when the
game shows them in the **Upgrade store** (top of the right panel). An upgrade
becomes available when its requirements are met, and is bought once. Buy order
matters — most upgrades chain into the next one.

> **Price note:** all non-prestige upgrades have their price multiplied by a
> global factor of **×100** (`UPGRADE_PRICE_SCALE`) at game start. The numbers
> below are the **base** prices; the prices you actually pay are 100×.

### 6.1 Building upgrades

Every building (except Cursor) has a ladder of **13 upgrades**, each one a **×2**
multiplier on that building's production, available at the following building
counts: **1, 5, 25, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500**.
Cursors have an equivalent ladder (14 upgrades at 1, 1, 10, 25, 50, 100, 150, 200,
250, 300, 350, 400, 450, 500).

Base prices follow the original game's wiki ladder (first upgrade ≈ 10× the
building's base price, then ×5, then ×10 per tier):

| Building        | 1st upgrade (base) | Base        |
| --------------- | ------------------ | ----------- |
| Cursor          | Reinforced index finger (100) | 1:100, 5:500, 10× thereafter |
| Grandma         | Forwards from grandma (1000)  | 1000, 5000, 50k, 5M, 500M, 50B, 50T, … |
| Farm            | Cheap hoes (11k)              | 11k, 55k, 550k, 55M, … |
| Mine            | Sugar gas (120k)              | 120k, 600k, 6M, 600M, … |
| Factory         | Sturdier conveyor belts (1.3M)| 1.3M, 6.5M, 65M, … |
| Bank            | Dizzy miss lizzy (14M)        | 14M, 70M, 700M, … |
| Temple          | Golden idols (200M)           | 200M, 1B, 10B, 1T, … |
| Wizard tower    | Pointier hats (3.3B)          | 3.3B, 16.5B, 165B, … |
| Shipment        | Vanilla nebulae (102B)        | 102B, 510B, 5.1T, … |
| Alchemy lab     | Antimony (1.5T)               | 1.5T, 7.5T, 75T, … |
| Portal          | Elder pact (1.5T)             | 1.5T, 7.5T, 75T, … |
| Time machine    | Flux capacitor (14T)          | 14T, 70T, 700T, … |

*(Example ladder — it continues ×2 on the multiplier and roughly ×10 on the
price all the way to 500 buildings.)*

### 6.2 Golden Cookie upgrades

| Upgrade      | Base price | Requirement | Effect |
| ------------ | ---------- | ----------- | ------ |
| Golden Cookies | 100 000  | 1 (any)     | Golden Cookies start appearing. |
| Lucky Day     | 10 000 000 | Golden Cookies | GC appear **×2 more often**, stay **×2 longer**. |
| Serendipity   | 1 000 000 000 | Lucky Day | GC appear **×2 more often**, stay **×2 longer**. |
| Get Lucky     | 100 000 000 000 | Serendipity | GC appear **×2 more often**. |

### 6.3 Kitten upgrades

Kitten upgrades multiply **all production** (global) based on how many
achievements you have unlocked. They chain into each other.

| Upgrade         | Base price | Required achievements | Effect    |
| --------------- | ---------- | --------------------- | --------- |
| Kitten helpers  | 9 000 000  | 13                    | Production ×1.5 |
| Kitten workers  | 900 000 000 | 25                   | Production ×1.75 |
| Kitten engineers | 90 000 000 000 | 50               | Production ×2   |
| Kitten overseers | 9 000 000 000 000 | 75             | Production ×2.5 |
| Kitten managers | 900 000 000 000 000 | 100            | Production ×3   |

### 6.4 Synergy upgrades

Synergy upgrades create **cross-building interactions**. Each one adds

```
partner bonus: target building gains +5% CpS per unit of the other building
reverse bonus:  other building gains +0.1% CpS per unit of the target
```

Requiring **15/15** (`Synergies vol. I`) or **75/75** (`Synergies vol. II`)
pairs, they are the deep-game economy.

| Upgrade (requires vol. I)    | Building pair (15)        | Effect (Target ← Partner)  |
| ---------------------------- | ------------------------- | -------------------------- |
| Future almanacs             | Farm ↔ Time machine       | Farm +5%/TM, TM +0.1%/Farm |
| Seismic magic               | Mine ↔ Wizard tower       | Mine +5%/WT, WT +0.1%/Mine |
| Contracts from beyond       | Bank ↔ Portal             | Bank +5%/Portal, Portal +0.1%/Bank |
| Paganism                    | Temple ↔ Portal           | Temple +5%/Portal, Portal +0.1%/Temple |
| Arcane knowledge            | Wizard tower ↔ Alchemy lab | WT +5%/Lab, Lab +0.1%/WT |
| Fossil fuels                | Mine ↔ Shipment           | Mine +5%/Shipment, Shipment +0.1%/Mine |
| Primordial ores             | Mine ↔ Alchemy lab        | Mine +5%/Lab, Lab +0.1%/Mine |
| Infernal crops              | Farm ↔ Portal             | Farm +5%/Portal, Portal +0.1%/Farm |
| Relativistic parsec-skipping | Shipment ↔ Time machine  | Shipment +5%/TM, TM +0.1%/Shipment |

| Upgrade (requires vol. II)   | Building pair (75)        | Effect (Target ← Partner)  |
| ---------------------------- | ------------------------- | -------------------------- |
| Rain prayer                 | Farm ↔ Temple             | Farm +5%/Temple, Temple +0.1%/Farm |
| Asteroid mining             | Mine ↔ Shipment           | Mine +5%/Ship, Ship +0.1%/Mine |
| Temporal overclocking       | Factory ↔ Time machine    | Factory +5%/TM, TM +0.1%/Factory |
| Printing presses            | Bank ↔ Factory            | Factory +5%/Bank, Bank +0.1%/Factory |
| Magical botany              | Farm ↔ Wizard tower       | Farm +5%/WT, WT +0.1%/Farm |
| Shipyards                   | Factory ↔ Shipment        | Factory +5%/Ship, Ship +0.1%/Factory |
| Gold fund                   | Bank ↔ Alchemy lab        | Bank +5%/Lab, Lab +0.1%/Bank |

**Synergies vol. I** (1T) is the gate to the 15-ladder, **Synergies vol. II**
(1P, requires vol. I) is the gate to the 75-ladder. They have no direct effect.

### 6.5 Prestige upgrades

These unlock your prestige power (see [Prestige](#11-prestige)). Prices here are
**not** scaled by ×100.

| Upgrade   | Price        | Required prestige | Unlocks    |
| --------- | ------------ | ----------------- | ---------- |
| Prestige I   | 1 million (10⁶)  | 1     | 20% of your prestige (ratio ×0.2) |
| Prestige II  | 1 billion (10⁹)  | 300   | 40% of your prestige (×0.4) |
| Prestige III | 1 trillion (10¹²) | 9 000 | 60% of your prestige (×0.6) |
| Prestige IV  | 1 quadrillion (10¹⁵) | 81 000 | 80% of your prestige (×0.8) |
| Prestige V   | 1 quintillion (10¹⁸) | 729 000 | 100% of your prestige (×1.0) |
| Prestige VI  | 1 sextillion (10²¹) | 6 561 000 | 100% of your prestige (×1.0) |

---

## 7. Golden Cookies

Once you buy the **Golden Cookies** upgrade, a golden cookie spawns randomly
on screen every **5 to 15 minutes** (real time), and stays for **13 seconds**
before fading. Only one golden cookie exists at a time.

- Spawn delay is divided by the spawn multiplier (up to **×8** with all three
  GC upgrades).
- Lifetime is multiplied by the duration multiplier (up to **×4**).

Click the cookie to roll one of five outcomes:

| Outcome        | Chance | Effect |
| -------------- | ------ | ------ |
| 🍀 **Lucky**       | 40%   | Instantly gain `min(15% of current cookies + 13, 15 min of CpS + 13)`. |
| ⚡ **Frenzy**       | 40%   | Cookie production **×7** for **77 seconds**. |
| 🏗️ **Building special** | 10% | A random owned building produces **×(count/10 + 1)** for **30 seconds**. |
| 👆 **Click Frenzy** | 3.7%  | Cookie clicking **×777** for **13 seconds**. |
| 🩸 **Clot**        | 6.3%  | (placeholder — currently does nothing.) |

### Buff display

Active buffs are shown as icons in the top-left, under the save menu, each with
a live countdown timer and a tooltip. While Frenzy or Click Frenzy is active,
the center comment box glows gold.

---

## 8. Grandmapocalypse

Once you hold **100,000 cookies**, the grandmas start getting angry. Their
anger grows over time in the background, and it cuts into your production.

### Anger accumulation

Anger (`grandmaAnger`) increases every tick at a rate that *accelerates* with
each stage:

```
rate = 800 × acceleration[level]   anger per second
acceleration = [×1, ×4, ×15, ×60]  (Calm → Apocalypse)
```

Anger only accumulates while you have ≥ 100,000 cookies **and** no Elder Pledge
is active.

### Stages

| Stage       | Anger threshold | Accel | Production | Approx. time to reach |
| ----------- | --------------- | ----- | ---------- | --------------------- |
| 😌 Calm     | 0               | ×1    | **×1.00**  | — |
| 😠 Angered  | 100 000         | ×4    | **×0.90**  | ~2 min after wrath starts |
| 😡 Furious  | 2 000 000       | ×15   | **×0.80**  | ~12 min |
| 👹 Apocalypse | 10 000 000    | ×60   | **×0.70**  | ~23 min |

The **production malus applies to all building production and cursor
auto-productions** — but **not to manual clicks**.

### Visuals

The wrath is reflected on screen:

- **Angered+** — background briefly "flashes" with grandma icons.
- **Furious+** — inverted / lustful grandma icons appear randomly.
- **Apocalypse** — `skellington` icons, plus a scrolling **kaleigrandma**
  backdrop once you also hold **1 billion** cookies.

The anger level is displayed in the save menu (`Grandmas: Anger (-X%)`); it
turns red when any stage is active. The background flashing can be disabled in
the menu (**Flashing Off**).

### Why would you ever want this?

None of the rage is permanent: an [Elder Pledge](#9-elder-pledge) instantly
resets it. Skilled players can also let the grandmas be angry while spending
their cookies on a Frenzy×Building-special combo, and calm them only when the
malus hurts.

---

## 9. Elder Pledge

The **Elder Pledge** is a special item always shown at the bottom of the
Upgrade store once the grandmas are angry.

| Property | Value |
| -------- | ----- |
| Base price | 64 cookies |
| Price growth | ×64 per purchase |
| Effect | Instantly calms the grandmas (anger → 0) for **6 minutes** |
| While active | **÷** — auto-production no longer suffers the anger malus; cursor-based gain (manual clicks *and* cursor autoclicks) becomes `ceil(cursorCount × 1.5)` — the grandmas help you click! |
| After expiry | Anger resumes from **0** and rebuilds over time. |

The current countdown is displayed in the save menu (`Elder Pledge mm:ss`).

Buying a pledge again raises the price to `64 × 64^count` (64, 4096, 262 144, …).

---

## 10. Achievements

There are **149 achievements** covering every part of the game. Unlocked ones
are shown in the **Menu → Achievements** overlay with their progress.

### Categories

| Category          | Count | Condition | Examples |
| ----------------- | ----- | --------- | -------- |
| Cookies/sec (CpS) | 10    | Reach a CpS milestone | Casual baking (1/s) → Let's never bake again (10 B/s) |
| Cookies in a run  | 9     | Press cookies in this run | Wake and bake (1) → Universal bakery (100 T) |
| Cursors           | 10    | Own N cursors | One finger (1) → Thumbs, phalanges, metacarpals (500) |
| Grandmas          | 10    | Own N grandmas | First grandma (1) → Defense of the ancients (500) |
| Farms             | 10    | Own N farms | First harvest (1) → Sharpest tool in the shed (500) |
| Mines             | 10    | Own N mines | First mine (1) → Hey now, you're a rock (500) |
| Factories         | 10    | Own N factories | First factory (1) → Break the mold (500) |
| Banks             | 10    | Own N banks | First investment (1) → Get the show on, get paid (500) |
| Temples           | 10    | Own N temples | First temple (1) → My world's on fire, how about yours (500) |
| Wizard towers     | 10    | Own N wizard towers | First spell (1) → The meteor men beg to differ (500) |
| Shipments         | 10    | Own N shipments | First shipment (1) → Only shooting stars (500) |
| Alchemy labs      | 10    | Own N labs | First experiment (1) → We could all use a little change (500) |
| Portals           | 10    | Own N portals | First portal (1) → Your brain gets smart but your head gets dumb (500) |
| Time machines     | 10    | Own N time machines | First trip (1) → The years start coming (500) |
| Resets            | 6     | Reset N times | Rebirth (1) → Reincarnation (100) |
| Prestige          | 4     | Hold N prestige | First prestige (1) → Godhead (81 000) |

Each building's ladder uses the milestone counts **1 / 5 / 10 / 20 / 50 / 100 /
200 / 300 / 400 / 500**.

> Achievements aren't just for show: **kitten upgrades** (see §6.3) multiply
> your whole production based on how many achievements you own.

---

## 11. Prestige

Resetting your game costs you your cookies, buildings and upgrades — but earns
you **prestige**, a permanent meta-currency.

### Prestige formula

```
prestige = floor( ∛(cookiesBakedAllTime / 10¹²) )
```

Only your **all-time total cookies** (not current) matter. Examples:

| All-time cookies | Prestige points |
| ---------------- | --------------- |
| 1 trillion (10¹²)   | 1 |
| 1 quadrillion (10¹⁵) | 10 |
| 1 quintillion (10¹⁸) | 100 |
| 1 sextillion (10²¹)  | 1 000 |
| 1 septillion (10²⁴)  | 10 000 |

*Aligned with current Cookie Clicker (v2+): 1 point per 10¹² baked, cube-root curve
— every factor of 1 000 in all-time cookies multiplies your prestige by 10.*

### Prestige power

Prestige points are useless until you "unleash" them with prestige upgrades:

```
prestigeMultiplier = 1 + prestige × powerRatio
```

| Situation                     | Power ratio |
| ----------------------------- | ----------- |
| Never reset                   | 0%          |
| After a first reset           | 2%          |
| **Prestige I** bought (1 point) | 20%       |
| **Prestige II** (300)         | 40%         |
| **Prestige III** (9 000)      | 60%         |
| **Prestige IV** (81 000)      | 80%         |
| **Prestige V/VI** (729 000 / 6 561 000) | 100% |

So with 1 000 prestige and Prestige I, your multiplier is `1 + 1000 × 0.2 =
201×`. This multiplier applies to **manual clicks and all production**.

### The five walls

Long-time players recognise the famous difficulty walls:

1. **The first wall (10¹² total)** — unlocking your first prestige point.
2. **Second wall (2,7·10¹⁹ total, 300 prestige)** — the second prestige upgrade
   becomes reachable (`∛300³·10¹²`).
3. **The third wall (7,29·10²³ total, 9 000 prestige)** — Demigod territory, on
   the road to Prestige III/IV.
4. **The fourth wall (3,87·10²⁹ total, 729 000 prestige)** — the road to
   Prestige V (100% of your prestige).
5. **The fifth wall (2,82·10³² total, 6 561 000 prestige)** — the final
   prestige upgrade, Prestige VI.

### Resetting

The **Reset** button computes your prestige gain, keeps your prestige,
achievements and all-time total, and zeroes the rest (see [Save system](#13-save-system--settings)).

---

## 12. Offline & idle

If you close the tab and come back later, the game credits you **25% of your
CpS** for every second you were away, capped at **24 hours**:

```
offlineGain = CpS × elapsedSeconds × 0.25    (elapsed ≤ 86 400 s)
```

- While the tab is hidden, the title switches to *"Idling…"*.
- On return, a popup announces how many cookies piled up while you were gone,
  and the buffs/anger timers are fast-forwarded correctly (pledge, frenzy,
  building special, grandma anger). Buffs do *not* tick down past 0.

---

## 13. Save system & settings

### Save

- Saved **automatically every 30 minutes**, manually with the **Save** button,
  or with **Ctrl+S** / **Cmd+S**.
- Stored in `localStorage` under `CookieClickerClassic_Reborn_Save`; settings
  under `CookieClickerClassic_Reborn_Settings`.
- **Format version 2** — saves include cookies, prestige, resets, pledge time,
  grandma anger, buildings (count + current price), bought upgrades, unlocked
  achievements, Golden Cookie timers and the elder pledge count. Loading a save
  rebuilds every multiplier and re-schedules Golden Cookies.
- **Export / Import** (Menu) gives you a copy-pasteable save string.
- Invalid/mismatched-version saves are rejected safely, and legacy saves are
  migrated automatically where possible.

### Reset string

The reset string keeps your **prestige, resets, achievements and all-time
cookies**, and zeroes buildings, upgrades, cookies, anger and pledge count.

### Settings

| Setting            | Default | Effect |
| ------------------ | ------- | ------ |
| Numbers On/Off   | On  | Toggles floating "+123" numbers. |
| Flashing On/Off  | On  | Toggles the Grandmapocalypse background flashing. |
| Bakery name      | —   | Renames your bakery (shown in the save menu). |

---

## 14. UI & shortcuts

| Element/Shortcut | What it does |
| ---------------- | ------------ |
| Big cookie       | Manual click (hold-down works). |
| Right panel: Buildings | Buy buildings (×1, or sub-button **×10** / **×100**). |
| Right panel: Upgrades | Buy available upgrades; **Elder Pledge** at bottom. |
| Menu button      | Opens overlay: Settings, Upgrades, Achievements, Changelog. |
| Ctrl+S / Cmd+S   | Manual save. |
| Reset button     | Resets the run for prestige. |
| Buffs (top-left) | Active Golden Cookie buffs + countdowns. |

---

## 15. Project structure

```
.
├── index.html      # Single-page UI
├── style.css       # All styles (map, stores, overlay, buffs, animations)
├── script.js       # All game logic (single file, ~2 600 lines)
├── *.png           # Sprites & icons (buildings, grandmas, golden cookie, …)
├── ajax.js         # Legacy loader (unused placeholder)
├── README.md       # Quick overview
└── DOCS.md         # This documentation
```

### Key gameplay constants (script.js)

| Constant | Value |
| -------- | ----- |
| TICKS_PER_SECOND | 30 |
| SAVE_INTERVAL_SECONDS | 30 min |
| MAX_OFFLINE_SECONDS | 24 h |
| GRANDMA_WRATH_COOKIES | 100 000 |
| GRANDMA_ANGER_THRESHOLDS | 100 k / 2 M / 10 M |
| GRANDMA_ANGER_ACCELERATION | ×1 / ×4 / ×15 / ×60 |
| GRANDMA_ANGER_MULTIPLIERS | ×1.00 / ×0.90 / ×0.80 / ×0.70 |
| Elder Pledge | 6 min, base 64, ×64/purchase |
| Frenzy | ×7 CpS for 77 s |
| Click Frenzy | ×777 clicking for 13 s |
| Building special | ×(count/10 + 1) for 30 s |
| Building price scale | ×1.15 per unit |
| Non-prestige upgrade price scale | ×100 |

---

*Want the developer view? See the in-game **Menu → Changelog** for the full
version history.*