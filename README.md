# 🍪 Cookie Clicker Classic — Reborn

> **Cookie Clicker Classic, but with a little more chaos.**

A refreshed and expanded version of **Orteil's classic Cookie Clicker**, rebuilt with new content, gameplay improvements, bug fixes, and questionable amounts of cookies.

The goal is simple: **make cookies, buy buildings, unlock upgrades, click Golden Cookies, ascend to godhood, fix things, and add stuff that probably didn't need to exist.**

> 📖 **Looking for the full reference?** The complete [**DOCS.md**](DOCS.md) documents every system: buildings, upgrades, Golden Cookies, achievements, the Grandmapocalypse, Elder Pledge, prestige, and the save format.

---

## ✨ What's in the game?

### 🏭 Buildings

The classic production system has been expanded with **12 buildings**, each with its own upgrade ladder up to **500 units**:

* 🖱️ Cursor
* 👵 Grandma
* 🌱 Farm
* ⛏️ Mine
* 🏭 Factory
* 🏦 Bank
* 🛕 Temple
* 🧙 Wizard Tower
* 🚀 Shipment
* ⚗️ Alchemy Lab
* 🌀 Portal
* ⏳ Time Machine

Building prices scale with the classic **×1.15** growth, and support **×1 / ×10 / ×100** purchases.

### 👹 Grandmapocalypse

New in recent versions — the grandmas don't like being overworked. Once you hold **100,000 cookies**, their **wrath** builds up over time across **4 stages**:

* 😌 **Calm** — production ×1.00
* 😠 **Angered** — production ×0.90
* 😡 **Furious** — production ×0.80
* 👹 **Apocalypse** — production ×0.70

The anger accelerates with each stage (×1 → ×4 → ×15 → ×60), the background starts flashing, and the grandmas get progressively more unsettling. Calm them back down with an **Elder Pledge**.

### ✋ Elder Pledge

A one-time purchase that instantly resets the anger and keeps the grandmas calm for **6 minutes** — during which they help you click (cursor clicks gain `count × 1.5`). Each pledge costs **64 cookies × 64 per pledge**.

### 🆙 Upgrades

A comprehensive upgrade system — **189 upgrades** in total:

* **Building upgrades** — ×2 multipliers per building (13 tiers each, up to 500 units)
* **Golden Cookie upgrades** — more frequent & longer-lasting cookies
* **Kitten upgrades** — global production multipliers gated by achievement count
* **Synergy upgrades** — cross-building boosts (+5% CpS per partner building), gated behind 15 and 75-unit pairs
* **Prestige upgrades** — unleash 20 → 100% of your prestige (I–VI)

Upgrades have real dependencies: previous upgrades, building counts, achievement counts, and prestige thresholds.

### 🍪 Golden Cookies

Golden Cookies spawn randomly (5–15 min base) and grant one of five outcomes:

* 🍀 **Lucky** — instant cookie windfall
* ⚡ **Frenzy** — production ×7 for 77s
* 👆 **Click Frenzy** — clicking ×777 for 13s
* 🏗️ **Building special** — one building ×(count/10+1) for 30s
* 🩸 **Clot** — (nothing yet)

Buff icons with live countdowns appear top-left.

### 💎 Prestige & reset

Reset your run to earn **prestige points** from your all-time cookies:

```
prestige = floor( ∛(allTime / 10¹²) )
```

Unlock them with **Prestige I–VI** (20 → 100% of your prestige) for a permanent
`× (1 + prestige × ratio)` multiplier. Classic **three walls** and prestige
achievements included.

### 📈 Achievements

**149 achievements** across every playstyle: CpS milestones, building counts
(up to 500 each), golden cookies, resets, and prestige. They're not just for
show — they unlock the **Kitten** upgrades.

### ⏰ Idle-friendly

Closing the tab earns **25% of your CpS** offline (capped at 24h). Buff and
wrath timers fast-forward correctly.

### 💾 Save System

Versioned saves (format v2) with **export/import**, manual save (**Ctrl+S**),
and auto-save every 30 minutes. Prestige and achievements survive resets;
legacy saves are handled.

---

## 🚧 Status

**Work in progress — v0.139**

The game is playable, but development is ongoing.

Things may still be unfinished, unbalanced, broken, or all three at once.

If you find a bug, feel free to open an issue.

If you find a really funny bug, **definitely** open an issue.

## 🧑‍💻 Development

This project is **100% vibe coded**.

No grand software architecture. No elaborate development methodology. Just vibes, cookies, and the occasional realization that something has been broken.

> **I don't care. I just want more cookies.**

The entire game logic lives in a single `script.js` (~2 600 lines) with no
external dependencies.

## 📜 Credits

This project is based on **Cookie Clicker Classic by Orteil**.

All credit for the original game and its core concept goes to **Orteil**.

This is a fan-made, modified version intended for experimentation, learning, and fun.

## ❤️ Why?

Because Cookie Clicker is fun.

And because there is always room for **one more upgrade**.

---

### 🍪 Click. Upgrade. Repeat.

**Make cookies. Break things. Fix them later.**