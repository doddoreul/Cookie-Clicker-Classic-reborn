/*
   The Box mini-game.

   Loaded lazily by script.js (loadTheBoxScript) the first time the
   player opens The Box. Everything below runs inside the #theBoxContent
   modal container.

   The player discovers 32 cats by combining two discovered cats.
   Recipes are never shown: the player must experiment.
   Internal ids are stable so displayed names can change without breaking
   saves.
*/

/* ================================================================ */
/* Recipes table — identifies the whole discovery graph             */
/* ================================================================ */

const CAT_HALF_DEAD = "CAT_HALF_DEAD";
const CAT_HALF_ALIVE = "CAT_HALF_ALIVE";

const CAT_DEAD_DEAD = "CAT_DEAD_DEAD";
const CAT_DEAD_ALIVE = "CAT_DEAD_ALIVE";
const CAT_ALIVE_DEAD = "CAT_ALIVE_DEAD";
const CAT_ALIVE_ALIVE = "CAT_ALIVE_ALIVE";

const CAT_MOSTLY_DEAD = "CAT_MOSTLY_DEAD";
const CAT_DEAD_PARADOX = "CAT_DEAD_PARADOX";
const CAT_MOSTLY_ALIVE = "CAT_MOSTLY_ALIVE";
const CAT_DEAD_RESONANCE = "CAT_DEAD_RESONANCE";
const CAT_LIVING_PARADOX = "CAT_LIVING_PARADOX";
const CAT_ALIVE_RESONANCE = "CAT_ALIVE_RESONANCE";
const CAT_DOUBLE_DEAD = "CAT_DOUBLE_DEAD";
const CAT_DOUBLE_ALIVE = "CAT_DOUBLE_ALIVE";

const CAT_SCHRODINGERS_CAT = "CAT_SCHRODINGERS_CAT";
const CAT_UNCERTAIN_CAT = "CAT_UNCERTAIN_CAT";
const CAT_SUPERPOSITION_CAT = "CAT_SUPERPOSITION_CAT";
const CAT_SPLIT_CAT = "CAT_SPLIT_CAT";
const CAT_CONTRADICTORY_CAT = "CAT_CONTRADICTORY_CAT";
const CAT_QUANTUM_CAT = "CAT_QUANTUM_CAT";
const CAT_UNSTABLE_CAT = "CAT_UNSTABLE_CAT";
const CAT_STABLE_QUANTUM_CAT = "CAT_STABLE_QUANTUM_CAT";

const CAT_RECONSTRUCTED_CAT = "CAT_RECONSTRUCTED_CAT";
const CAT_COHERENT_CAT = "CAT_COHERENT_CAT";
const CAT_ALMOST_ALIVE_CAT = "CAT_ALMOST_ALIVE_CAT";
const CAT_ALMOST_DEAD_CAT = "CAT_ALMOST_DEAD_CAT";
const CAT_PERFECT_SUPERPOSITION = "CAT_PERFECT_SUPERPOSITION";
const CAT_LIVING_PROBABILITY = "CAT_LIVING_PROBABILITY";

const CAT_TRUE_SUPERPOSITION = "CAT_TRUE_SUPERPOSITION";
const CAT_FALSE_LIFE = "CAT_FALSE_LIFE";
const CAT_QUANTUM_LIFE = "CAT_QUANTUM_LIFE";

const CAT_ALIVE = "CAT_ALIVE";

const Box = {};

Box.ASSET_PATH = "thebox/";
Box.ICON = "kittens.png";
Box.BOX_ICON = "thebox.png";

Box.CATS = {
  CAT_HALF_DEAD: { id: "CAT_HALF_DEAD", name: "Half-Dead" },
  CAT_HALF_ALIVE: { id: "CAT_HALF_ALIVE", name: "Half-Alive" },

  CAT_DEAD_DEAD: { id: "CAT_DEAD_DEAD", name: "Dead-Dead" },
  CAT_DEAD_ALIVE: { id: "CAT_DEAD_ALIVE", name: "Dead-Alive" },
  CAT_ALIVE_DEAD: { id: "CAT_ALIVE_DEAD", name: "Alive-Dead" },
  CAT_ALIVE_ALIVE: { id: "CAT_ALIVE_ALIVE", name: "Alive-Alive" },

  CAT_MOSTLY_DEAD: { id: "CAT_MOSTLY_DEAD", name: "Mostly Dead" },
  CAT_DEAD_PARADOX: { id: "CAT_DEAD_PARADOX", name: "Dead Paradox" },
  CAT_MOSTLY_ALIVE: { id: "CAT_MOSTLY_ALIVE", name: "Mostly Alive" },
  CAT_DEAD_RESONANCE: { id: "CAT_DEAD_RESONANCE", name: "Dead Resonance" },
  CAT_LIVING_PARADOX: { id: "CAT_LIVING_PARADOX", name: "Living Paradox" },
  CAT_ALIVE_RESONANCE: { id: "CAT_ALIVE_RESONANCE", name: "Alive Resonance" },
  CAT_DOUBLE_DEAD: { id: "CAT_DOUBLE_DEAD", name: "Double Dead" },
  CAT_DOUBLE_ALIVE: { id: "CAT_DOUBLE_ALIVE", name: "Double Alive" },

  CAT_SCHRODINGERS_CAT: { id: "CAT_SCHRODINGERS_CAT", name: "Schrödinger's Cat" },
  CAT_UNCERTAIN_CAT: { id: "CAT_UNCERTAIN_CAT", name: "Uncertain Cat" },
  CAT_SUPERPOSITION_CAT: { id: "CAT_SUPERPOSITION_CAT", name: "Superposition Cat" },
  CAT_SPLIT_CAT: { id: "CAT_SPLIT_CAT", name: "Split Cat" },
  CAT_CONTRADICTORY_CAT: { id: "CAT_CONTRADICTORY_CAT", name: "Contradictory Cat" },
  CAT_QUANTUM_CAT: { id: "CAT_QUANTUM_CAT", name: "Quantum Cat" },
  CAT_UNSTABLE_CAT: { id: "CAT_UNSTABLE_CAT", name: "Unstable Cat" },
  CAT_STABLE_QUANTUM_CAT: { id: "CAT_STABLE_QUANTUM_CAT", name: "Stable Quantum Cat" },

  CAT_RECONSTRUCTED_CAT: { id: "CAT_RECONSTRUCTED_CAT", name: "Reconstructed Cat" },
  CAT_COHERENT_CAT: { id: "CAT_COHERENT_CAT", name: "Coherent Cat" },
  CAT_ALMOST_ALIVE_CAT: { id: "CAT_ALMOST_ALIVE_CAT", name: "Almost Alive Cat" },
  CAT_ALMOST_DEAD_CAT: { id: "CAT_ALMOST_DEAD_CAT", name: "Almost Dead Cat" },
  CAT_PERFECT_SUPERPOSITION: { id: "CAT_PERFECT_SUPERPOSITION", name: "Perfect Superposition" },
  CAT_LIVING_PROBABILITY: { id: "CAT_LIVING_PROBABILITY", name: "Living Probability" },

  CAT_TRUE_SUPERPOSITION: { id: "CAT_TRUE_SUPERPOSITION", name: "True Superposition" },
  CAT_FALSE_LIFE: { id: "CAT_FALSE_LIFE", name: "False Life" },
  CAT_QUANTUM_LIFE: { id: "CAT_QUANTUM_LIFE", name: "Quantum Life" },

  CAT_ALIVE: { id: "CAT_ALIVE", name: "Alive Cat" }
};

/*
   Internal structure (never shown):
   2 / 4 / 8 / 8 / 6 / 3 / 1  = 32 cats.

   Recipes: "first second" -> result. Order matters; the reversed pair is
   a different (and usually empty) combination.
*/
Box.RECIPES = {
  // Level 2 (from the two halves)
  "CAT_HALF_DEAD CAT_HALF_DEAD": "CAT_DEAD_DEAD",
  "CAT_HALF_DEAD CAT_HALF_ALIVE": "CAT_DEAD_ALIVE",
  "CAT_HALF_ALIVE CAT_HALF_DEAD": "CAT_ALIVE_DEAD",
  "CAT_HALF_ALIVE CAT_HALF_ALIVE": "CAT_ALIVE_ALIVE",

  // Level 3 (8)
  "CAT_HALF_DEAD CAT_DEAD_DEAD": "CAT_MOSTLY_DEAD",
  "CAT_HALF_ALIVE CAT_DEAD_DEAD": "CAT_DEAD_PARADOX",
  "CAT_HALF_ALIVE CAT_ALIVE_ALIVE": "CAT_MOSTLY_ALIVE",
  "CAT_HALF_DEAD CAT_ALIVE_ALIVE": "CAT_LIVING_PARADOX",
  "CAT_DEAD_DEAD CAT_DEAD_ALIVE": "CAT_DEAD_RESONANCE",
  "CAT_ALIVE_ALIVE CAT_ALIVE_DEAD": "CAT_ALIVE_RESONANCE",
  "CAT_DEAD_DEAD CAT_DEAD_DEAD": "CAT_DOUBLE_DEAD",
  "CAT_ALIVE_ALIVE CAT_ALIVE_ALIVE": "CAT_DOUBLE_ALIVE",

  // Level 4 (8)
  "CAT_DEAD_ALIVE CAT_ALIVE_DEAD": "CAT_SCHRODINGERS_CAT",
  "CAT_DEAD_PARADOX CAT_MOSTLY_ALIVE": "CAT_UNCERTAIN_CAT",
  "CAT_MOSTLY_DEAD CAT_MOSTLY_ALIVE": "CAT_SUPERPOSITION_CAT",
  "CAT_DOUBLE_DEAD CAT_DOUBLE_ALIVE": "CAT_SPLIT_CAT",
  "CAT_DEAD_DEAD CAT_ALIVE_ALIVE": "CAT_CONTRADICTORY_CAT",
  "CAT_SCHRODINGERS_CAT CAT_SUPERPOSITION_CAT": "CAT_QUANTUM_CAT",
  "CAT_QUANTUM_CAT CAT_UNCERTAIN_CAT": "CAT_UNSTABLE_CAT",
  "CAT_QUANTUM_CAT CAT_SUPERPOSITION_CAT": "CAT_STABLE_QUANTUM_CAT",

  // Level 5 (6)
  "CAT_UNCERTAIN_CAT CAT_SCHRODINGERS_CAT": "CAT_RECONSTRUCTED_CAT",
  "CAT_STABLE_QUANTUM_CAT CAT_SCHRODINGERS_CAT": "CAT_COHERENT_CAT",
  "CAT_SUPERPOSITION_CAT CAT_MOSTLY_ALIVE": "CAT_ALMOST_ALIVE_CAT",
  "CAT_SUPERPOSITION_CAT CAT_MOSTLY_DEAD": "CAT_ALMOST_DEAD_CAT",
  "CAT_SUPERPOSITION_CAT CAT_SCHRODINGERS_CAT": "CAT_PERFECT_SUPERPOSITION",
  "CAT_QUANTUM_CAT CAT_ALIVE_ALIVE": "CAT_LIVING_PROBABILITY",

  // Level 6 (3)
  "CAT_PERFECT_SUPERPOSITION CAT_STABLE_QUANTUM_CAT": "CAT_TRUE_SUPERPOSITION",
  "CAT_COHERENT_CAT CAT_ALMOST_ALIVE_CAT": "CAT_FALSE_LIFE",
  "CAT_QUANTUM_CAT CAT_LIVING_PROBABILITY": "CAT_QUANTUM_LIFE",

  // Level 7 (1) — the single, unique recipe for Alive Cat
  "CAT_TRUE_SUPERPOSITION CAT_QUANTUM_LIFE": "CAT_ALIVE"
};

/* ================================================================ */
/* Validation (graph coherence)                                      */
/* ================================================================ */

Box.validate = function () {
  const catIds = Object.keys(Box.CATS);
  const fails = [];

  // 1. All 32 cats defined; every recipe target valid
  if (catIds.length !== 32) {
    fails.push(`cats: expected 32, got ${catIds.length}`);
  }

  const seeds = ["CAT_HALF_DEAD", "CAT_HALF_ALIVE"];
  if (!seeds.every(id => Box.CATS[id])) fails.push("missing seed cats");

  const targets = Object.values(Box.RECIPES);
  targets.forEach(id => {
    if (!Box.CATS[id]) fails.push(`recipe produces unknown cat ${id}`);
  });

  // 2. Every non-seed cat is produced at least once
  const produced = new Set(targets);
  catIds.forEach(id => {
    if (!seeds.includes(id) && !produced.has(id)) {
      fails.push(`cat ${id} has no recipe`);
    }
  });

  // 3. All cats are reachable from the seeds
  const reachable = new Set(seeds);
  let changed = true;
  while (changed) {
    changed = false;
    Object.entries(Box.RECIPES).forEach(([key, target]) => {
      if (reachable.has(target)) return;
      const [a, b] = key.split(" ");
      if (reachable.has(a) && reachable.has(b)) {
        reachable.add(target);
        changed = true;
      }
    });
  }
  const unreachable = catIds.filter(id => !reachable.has(id));
  if (unreachable.length) {
    fails.push(`unreachable cats: ${unreachable.join(", ")}`);
  }

  // 4+5. Alive Cat: exactly one recipe, and nothing else yields it
  const aliveKeys = Object.keys(Box.RECIPES).filter(k => Box.RECIPES[k] === CAT_ALIVE);
  if (aliveKeys.length !== 1) {
    fails.push(`Alive Cat must have exactly 1 recipe, got ${aliveKeys.length}`);
  }

  // 6. No duplicate ordered pair
  const seen = {};
  Object.keys(Box.RECIPES).forEach(key => {
    if (seen[key]) fails.push(`duplicate recipe ${key}`);
    seen[key] = true;
  });

  // 7. Reversed pairs: if both are defined they must differ
  Object.keys(Box.RECIPES).forEach(key => {
    const [a, b] = key.split(" ");
    const revKey = `${b} ${a}`;
    if (Box.RECIPES[revKey] && Box.RECIPES[revKey] === Box.RECIPES[key]) {
      fails.push(`recipe ${key} and reverse ${revKey} give same result`);
    }
  });

  // 8. No recipe recreates its own input
  Object.entries(Box.RECIPES).forEach(([key, target]) => {
    const [a, b] = key.split(" ");
    if (a === b && target === a) fails.push(`recipe ${key} recreates its input`);
  });

  return { ok: fails.length === 0, fails };
};

/* ================================================================ */
/* State                                                             */
/* ================================================================ */

/*
   phase: "initial"      box empty, only the first cat is present
          "schrodinger"  the very first cat is inside the box
          "combination"  first manipulation done, recipes unlocked
          "completed"    Alive Cat found
*/
Box.state = {
  phase: "initial",
  discovered: [],            // cat ids the player can use
  inBoxCats: [],             // 0-2 cat ids currently inside the box
  firstCatInBox: false,      // the very first cat is in the box
  completed: false
};

Box.hasCat = function (id) {
  return Box.state.discovered.includes(id);
};

Box.tryRecipe = function (a, b) {
  if (!a || !b) return null;
  return Box.RECIPES[`${a} ${b}`] || null;
};

Box.notifyBoxProgress = function () {
  if (!Box._notifyHook) return;
  try { Box._notifyHook(); } catch (e) { /* ignore */ }
};

Box._discover = function (id) {
  if (!Box.hasCat(id)) {
    Box.state.discovered.push(id);
    return true;
  }
  return false;
};

// Called by a click or a drop: cats go straight into the box (max 2).
Box._addToBox = function (catId) {
  if (catId === "FIRST" || !Box.hasCat(catId)) return;
  if (!(Box.state.phase === "combination" || Box.state.phase === "completed")) return;

  if (Box.state.inBoxCats.length >= 2) {
    Box.showResult({ text: "Mmmm, can't do that, too unstable.", discoveries: [] });
    return;
  }

  Box.state.inBoxCats.push(catId);
  Box.render();
};

// Removes whatever is inside the box.
Box.emptyBox = function () {
  Box.state.inBoxCats = [];
  if (Box.state.firstCatInBox) {
    Box.state.firstCatInBox = false;
    Box.state.phase = "initial";
  }
  Box.render();
};

/* ================================================================ */
/* Look Inside / Manipulate                                          */
/* ================================================================ */

Box.lookInside = function () {
  if (Box.state.phase === "initial" && !Box.state.firstCatInBox) {
    return { text: "The box is empty.", discoveries: [] };
  }

  if (Box.state.phase === "schrodinger" || (Box.state.phase === "initial" && Box.state.firstCatInBox)) {
    const alive = Math.random() < 0.5;
    return { text: alive ? "The cat is alive." : "The cat is dead.", discoveries: [] };
  }

  if (Box.state.inBoxCats.length === 1) {
    return { text: Box.CATS[Box.state.inBoxCats[0]].name, discoveries: [] };
  }

  if (Box.state.inBoxCats.length === 2) {
    return {
      text: `${Box.CATS[Box.state.inBoxCats[0]].name} and ${Box.CATS[Box.state.inBoxCats[1]].name}.`,
      discoveries: []
    };
  }

  return { text: "The box is empty.", discoveries: [] };
};

Box.manipulate = function () {
  // --- Initial / Schrödinger phase: the very first manipulation ---
  if (Box.state.phase === "initial" && !Box.state.firstCatInBox) {
    return { text: "The box is empty.", discoveries: [], completed: false };
  }

  if (Box.state.phase === "schrodinger" || (Box.state.phase === "initial" && Box.state.firstCatInBox)) {
    Box.state.firstCatInBox = false;
    Box.state.phase = "combination";
    Box.state.inBoxCats = [];

    const newOnes = [];
    [CAT_HALF_DEAD, CAT_HALF_ALIVE].forEach(id => {
      if (Box._discover(id)) newOnes.push(id);
    });

    Box.notifyBoxProgress();
    Box.render();

    return { text: "The box opens. Half-Dead and Half-Alive come out.", discoveries: newOnes, completed: false };
  }

  // --- Combination phase: two cats must be inside the box ---
  if (Box.state.inBoxCats.length !== 2) {
    return { text: "Nothing happened.", discoveries: [], completed: false };
  }

  const a = Box.state.inBoxCats[0];
  const b = Box.state.inBoxCats[1];
  Box.state.inBoxCats = [];

  const result = Box.tryRecipe(a, b);
  if (!result) {
    return { text: "Nothing happened.", discoveries: [], completed: false };
  }

  const isNew = Box._discover(result);
  Box.state.inBoxCats = [];

  let completed = false;
  if (result === CAT_ALIVE && !Box.state.completed) {
    Box.state.completed = true;
    Box.state.phase = "completed";
    completed = true;
  }

  Box.notifyBoxProgress();
  Box.render();

  if (completed) {
    return {
      text: `${Box.CATS[result].name} — the puzzle is solved.`,
      discoveries: isNew ? [result] : [],
      completed: true
    };
  }

  return {
    text: Box.CATS[result].name,
    discoveries: isNew ? [result] : [],
    completed: false
  };
};

/* ================================================================ */
/* Save / load                                                       */
/* ================================================================ */

Box.saveData = function () {
  return {
    phase: Box.state.phase,
    discovered: Box.state.discovered.slice(),
    inBoxCats: Box.state.inBoxCats.slice(),
    firstCatInBox: !!Box.state.firstCatInBox,
    completed: !!Box.state.completed
  };
};

Box.loadData = function (data) {
  if (!data || typeof data !== "object") return;

  if (["initial", "schrodinger", "combination", "completed"].includes(data.phase)) {
    Box.state.phase = data.phase;
  }

  if (Array.isArray(data.discovered)) {
    const valid = [...new Set(data.discovered.filter(id => Box.CATS[id]))];
    Box.state.discovered = valid;
  }

  if (Array.isArray(data.inBoxCats)) {
    Box.state.inBoxCats = data.inBoxCats
      .filter(id => Box.CATS[id])
      .slice(0, 2);
  }

  Box.state.firstCatInBox = !!data.firstCatInBox;
  Box.state.completed = !!data.completed;
};

/* ================================================================ */
/* UI                                                                */
/* ================================================================ */

Box._content = null;
Box._messageTimers = [];

Box.$ = function (selector) {
  return Box._content ? Box._content.querySelector(selector) : null;
};

Box.showResult = function (result) {
  const el = Box.$("#boxResult");
  if (!el) return;

  let html = `<div class="boxResultText">${result.text}</div>`;

  if (result.discoveries && result.discoveries.length) {
    html = `<div class="boxResultText">New cat discovered!</div>` +
      Box._discoveryHtml(result.discoveries);
  }

  el.innerHTML = html;
  el.classList.add("show");
  Box._messageTimers.push(setTimeout(() => el.classList.remove("show"), 2600));
};

Box._discoveryHtml = function (ids) {
  return ids.map(id => `
    <div class="boxCat discovered" data-cat="${id}">
      <img src="${Box.ASSET_PATH}${Box.ICON}" alt="${Box.CATS[id].name}" draggable="false">
      <span>${Box.CATS[id].name}</span>
    </div>
  `).join("");
};

Box._catHtml = function (id) {
  return `
    <div class="boxCat" draggable="true" data-cat="${id}" title="${Box.CATS[id].name}">
      <img src="${Box.ASSET_PATH}${Box.ICON}" alt="${Box.CATS[id].name}" draggable="false">
      <span>${Box.CATS[id].name}</span>
    </div>
  `;
};

Box._boxHtml = function () {
  let inner = "";
  let labels = "";

  if (Box.state.firstCatInBox) {
    inner = `<div class="boxCat inside" data-cat="FIRST" title="Cat">
      <img src="${Box.ASSET_PATH}${Box.ICON}" alt="Cat" draggable="false">
    </div>`;
    labels = `<span class="boxInnerType">Cat</span>`;
  } else if (Box.state.inBoxCats.length) {
    inner = Box.state.inBoxCats.map(id => `
      <div class="boxCat inside" data-cat="${id}" title="${Box.CATS[id].name}">
        <img src="${Box.ASSET_PATH}${Box.ICON}" alt="${Box.CATS[id].name}" draggable="false">
      </div>
    `).join("");
    labels = Box.state.inBoxCats
      .map(id => `<span class="boxInnerType">${Box.CATS[id].name}</span>`)
      .join("");
  }

  return `
    <div class="boxContainer" data-zone="box" title="Box">
      <img src="${Box.ASSET_PATH}${Box.BOX_ICON}" alt="Box" draggable="false">
      ${inner}
    </div>
    <div class="boxInnerTypes">${labels}</div>
  `;
};

Box.render = function () {
  if (!Box._content) return;

  const canEmpty = Box.state.inBoxCats.length > 0 || Box.state.firstCatInBox;

  Box._content.innerHTML = `
    <div class="boxGame">
      <div id="boxButtons">
        <button class="boxButton" data-action="look">Look Inside</button>
        <button class="boxButton" data-action="manipulate">Manipulate</button>
        <button class="boxButton" data-action="empty" ${canEmpty ? "" : "disabled"}>Empty the box</button>
      </div>
      <div id="boxExperimentArea"></div>
      <div id="boxResult"></div>
      <div id="boxCollection"></div>
    </div>
  `;

  Box._content.querySelector("[data-action='look']").addEventListener("click", () => {
    Box.showResult(Box.lookInside());
  });

  Box._content.querySelector("[data-action='manipulate']").addEventListener("click", () => {
    Box.showResult(Box.manipulate());
  });

  Box._content.querySelector("[data-action='empty']").addEventListener("click", () => {
    Box.emptyBox();
  });

  Box._bindContent();
  Box._renderPhase();
};

Box._renderPhase = function () {
  const area = Box.$("#boxExperimentArea");
  if (!area) return;

  const firstCatHtml = `
    <div class="boxFirstCat" draggable="true" data-cat="FIRST" title="Cat">
      <img src="${Box.ASSET_PATH}${Box.ICON}" alt="Cat" draggable="false">
      <span>Cat</span>
    </div>
  `;

  let experimentHtml, hint = "";
  if (Box.state.phase === "schrodinger" || (Box.state.phase === "initial" && Box.state.firstCatInBox)) {
    experimentHtml = `<div class="boxExperiment"><div class="boxOuter">${Box._boxHtml()}</div></div>`;
    hint = "The cat is in the box.";
  } else if (Box.state.phase === "combination" || Box.state.phase === "completed") {
    experimentHtml = `<div class="boxExperiment"><div class="boxOuter">${Box._boxHtml()}</div></div>`;
    hint = "Drop up to 2 cats into the box.";
  } else {
    // initial: first cat outside the box
    experimentHtml = `
      <div class="boxExperiment">
        <div class="boxOuter">${firstCatHtml}</div>
        <div class="boxOuter">${Box._boxHtml()}</div>
      </div>
    `;
    hint = "Drag the cat into the box.";
  }

  area.innerHTML = `<div class="boxHint">${hint}</div>` + experimentHtml;

  const catalogue = Box.$("#boxCollection");
  if (catalogue) {
    const total = Object.keys(Box.CATS).length;
    const discovered = Object.keys(Box.CATS).filter(id => Box.hasCat(id));
    const missing = Object.keys(Box.CATS).filter(id => !Box.hasCat(id));

    const label = `<div class="boxCatalogueLabel">Discovered <span class="boxCatalogueCount">${discovered.length}/${total}</span></div>`;
    const items = [
      ...discovered.map(id => Box._catHtml(id)),
      ...missing.map(() => `<div class="boxCatMissing" title="Undiscovered cat">?</div>`)
    ].join("");
    catalogue.innerHTML = label + `<div class="boxCatalogue">${items}</div>`;
  }

  Box._bindDrag();
};

/* ---------------------------------------------------------------- */
/* Interactions: drag & drop + click-to-place                        */
/* ---------------------------------------------------------------- */

Box._bindContent = function () {
  if (Box._content._boxBound) return;
  Box._content._boxBound = true;

  Box._content.addEventListener("click", event => {
    const catEl = event.target.closest("[data-cat]");
    if (!catEl) return;
    const catId = catEl.dataset.cat;

    // FIRST cat: put it into the box (or do nothing if already inside)
    if (catId === "FIRST") {
      if (!Box.state.firstCatInBox) {
        Box.state.firstCatInBox = true;
        Box.state.phase = "schrodinger";
        Box.render();
      }
      return;
    }

    // Cat inside the box -> remove it (first occurrence)
    if (event.target.closest(".boxContainer")) {
      const index = Box.state.inBoxCats.indexOf(catId);
      if (index >= 0) {
        Box.state.inBoxCats.splice(index, 1);
        Box.render();
      }
      return;
    }

    // Cat from the catalogue -> drop it into the box
    if (event.target.closest(".boxCatalogue")) {
      Box._addToBox(catId);
    }
  });
};

Box._bindDrag = function () {
  if (!Box._content) return;

  Box._content.querySelectorAll("[data-cat]").forEach(el => {
    el.addEventListener("dragstart", event => {
      event.dataTransfer.setData("text/plain", el.dataset.cat);
      event.dataTransfer.effectAllowed = "copy";
    });
  });

  Box._content.querySelectorAll("[data-zone='box']").forEach(zone => {
    zone.addEventListener("dragover", event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      zone.classList.add("dropTarget");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("dropTarget"));
    zone.addEventListener("drop", event => {
      event.preventDefault();
      zone.classList.remove("dropTarget");
      const catId = event.dataTransfer.getData("text/plain");
      if (!catId) return;
      Box.handleDrop(catId, zone);
    });
  });
};

Box.handleDrop = function (catId, zone) {
  if (!zone.dataset || zone.dataset.zone !== "box") return;

  if (catId === "FIRST") {
    if (!Box.state.firstCatInBox) {
      Box.state.firstCatInBox = true;
      Box.state.phase = "schrodinger";
      Box.render();
    }
    return;
  }

  Box._addToBox(catId);
};

/* ================================================================ */
/* Automated tests                                                   */
/* ================================================================ */

Box.runTests = function () {
  const results = [];
  const v = Box.validate();
  results.push(["graph validation", v.ok ? "PASS" : "FAIL", v.fails.join(" | ")]);

  const savedPhase = Box.state.phase;
  const savedDisc = Box.state.discovered.slice();
  const savedInBox = Box.state.inBoxCats.slice();
  const savedFirst = Box.state.firstCatInBox;
  const savedCompleted = Box.state.completed;

  const fresh = () => {
    Box.state.phase = "initial";
    Box.state.discovered = [];
    Box.state.inBoxCats = [];
    Box.state.firstCatInBox = false;
    Box.state.completed = false;
  };

  // 12. Empty box
  fresh();
  const rEmpty = Box.lookInside();
  results.push(["12 empty box", rEmpty.text === "The box is empty." ? "PASS" : "FAIL", rEmpty.text]);

  // 13. Schrödinger phase (first cat inside)
  fresh();
  Box.state.firstCatInBox = true;
  Box.state.phase = "schrodinger";
  const alive = new Set();
  for (let i = 0; i < 40; i++) alive.add(Box.lookInside().text);
  const bothObserved = alive.has("The cat is alive.") && alive.has("The cat is dead.");
  results.push(["13 alive/dead", bothObserved ? "PASS" : "FAIL", [...alive].join(" / ")]);

  // 14. Combination phase: Look Inside reveals the exact type of one cat inside
  fresh();
  Box.state.phase = "combination";
  Box.state.inBoxCats = [CAT_HALF_DEAD];
  const rExact = Box.lookInside();
  results.push(["14 exact type", rExact.text === "Half-Dead" ? "PASS" : "FAIL", rExact.text]);

  // 3. Solve everything by BFS from the two seeds
  fresh();
  Box.state.phase = "combination";
  Box.state.discovered = [CAT_HALF_DEAD, CAT_HALF_ALIVE];
  const solved = new Set(Box.state.discovered);
  let rounds = 0;
  while (rounds < 50) {
    let progress = false;
    Object.entries(Box.RECIPES).forEach(([key, target]) => {
      if (solved.has(target)) return;
      const [a, b] = key.split(" ");
      if (solved.has(a) && solved.has(b)) {
        solved.add(target);
        progress = true;
      }
    });
    if (!progress) break;
    rounds++;
  }
  results.push([
    "all cats reachable (BFS)",
    solved.size === 32 ? "PASS" : "FAIL",
    `solved ${solved.size}/32`
  ]);

  // 15. Alive Cat completes the box
  fresh();
  Box.state.phase = "combination";
  Box.state.discovered = Object.keys(Box.CATS);
  Box.state.inBoxCats = [CAT_TRUE_SUPERPOSITION, CAT_QUANTUM_LIFE];
  const rComplete = Box.manipulate();
  results.push([
    "15 alive completes + box emptied",
    rComplete.completed && Box.state.completed && Box.state.inBoxCats.length === 0 ? "PASS" : "FAIL",
    rComplete.text + ` (cats=${Box.state.inBoxCats.length})`
  ]);

  // 16. The box refuses a third cat, and empties when asked
  fresh();
  Box.state.phase = "combination";
  Box.state.discovered = Object.keys(Box.CATS);
  Box._addToBox(CAT_HALF_DEAD);
  Box._addToBox(CAT_HALF_ALIVE);
  Box._addToBox(CAT_ALIVE_DEAD); // refused
  const keptTwo = Box.state.inBoxCats.length === 2;
  Box.emptyBox();
  results.push([
    "max 2 cats in the box",
    keptTwo && Box.state.inBoxCats.length === 0 ? "PASS" : "FAIL",
    `cats=${Box.state.inBoxCats.length}`
  ]);

  // Number of recipes vs cats (there should be one recipe per non-seed cat)
  const recipeCount = Object.keys(Box.RECIPES).length;
  results.push([
    "recipe count = 30 for 30 non-seed cats",
    recipeCount === 30 ? "PASS" : "FAIL",
    String(recipeCount)
  ]);

  Box.state.phase = savedPhase;
  Box.state.discovered = savedDisc;
  Box.state.inBoxCats = savedInBox;
  Box.state.firstCatInBox = savedFirst;
  Box.state.completed = savedCompleted;

  return results;
};

/* ================================================================ */
/* Init                                                              */
/* ================================================================ */

Box.init = function () {
  const content = document.getElementById("theBoxContent");
  if (!content) return;

  Box._content = content;
  Box._messageTimers.forEach(t => clearTimeout(t));
  Box._messageTimers = [];

  Box.render();

  if (window.location.hash.includes("boxtest")) {
    const lines = Box.runTests().map(([name, status, info]) =>
      `${status.padEnd(4)} ${name}${info ? " — " + info : ""}`
    ).join("\n");
    console.log("[The Box] tests:\n" + lines);

    const msg = document.createElement("div");
    msg.style.cssText = "color:#c00;padding:8px;font-size:12px;white-space:pre;";
    msg.textContent = lines;
    Box._content.appendChild(msg);
  }
};

// Called by script.js once the script has loaded.
function initTheBox() {
  Box.init();
}

// Expose for script.js save integration.
window.Box = Box;