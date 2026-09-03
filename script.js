
"use strict";

/* ---------------------------------------------------------------- */
/* DOM and formatting helpers                                      */
/* ---------------------------------------------------------------- */

const VERSION = 0.128;
const SAVE_KEY = "CookieClickerClassic_Reborn_Save";
const COOKIE_SAVE_NAME = "CookieClickerSave";
const SAVE_FORMAT_VERSION = 2;
const TICKS_PER_SECOND = 30;
const SAVE_INTERVAL_SECONDS = 30 * 60;
const MAX_BUILDING_COUNT = 1000;
const MAX_VISIBLE_UPGRADES = 5;

function getElement(id) {
  return document.getElementById(id);
}

function beautify(value) {
  const digits = Math.floor(value).toString().split("").reverse();
  let output = "";

  digits.forEach((digit, index) => {
    if (index % 3 === 0 && index > 0) output = "," + output;
    output = digit + output;
  });

  return output;
}

/* ---------------------------------------------------------------- */
/* Game state                                                       */
/* ---------------------------------------------------------------- */

let loaded = false;
let numbersOn = true;
let flashing = true;
let storeToRebuild = true;
let upgradesToRebuild = true;
let cookies = 0;
let cookiesDisplay = 0;
let ticks = 0;
let prestige = 0;
let pledge = 0;
let saveTimer = SAVE_INTERVAL_SECONDS;

const buildings = {
  Cursor: {
    count: 0,
    basePrice: 15,
    gain: 1,
    description: "Autoclicks every 5 seconds.",
    icon: "cursoricon"
  },
  Grandma: {
    count: 0,
    basePrice: 100,
    gain: 4,
    description: "A nice grandma to bake more cookies.",
    icon: "grandmaicon"
  },
  Farm: {
    count: 0,
    basePrice: 500,
    gain: 40,
    description: "Grows cookie plants from cookie seeds.",
    icon: "farmicon"
  },
  Mine: {
    count: 0,
    basePrice: 2000,
    gain: 50,
    description: "Mines out cookie dough and chocolate chips.",
    icon: "mineicon"
  },
  Factory: {
    count: 0,
    basePrice: 7000,
    gain: 20,
    description: "Produces large quantities of cookies.",
    icon: "factoryicon"
  },
  Bank: {
    count: 0,
    basePrice: 50000,
    gain: 250,
    description: "Generates cookies from interest.",
    icon: "bankicon"
  },
  Temple: {
    count: 0,
    basePrice: 1000000,
    gain: 390,
    description: "Full of precious, ancient chocolate.",
    icon: "templeicon"
  },
  "Wizard tower": {
    count: 0,
    basePrice: 123456789,
    gain: 2200,
    description: "Summons cookies with magic spells.",
    icon: "wizardtowericon"
  },
  Shipment: {
    count: 0,
    basePrice: 1000000000,
    gain: 100,
    description: "Brings in fresh cookies from the cookie planet.",
    icon: "shipmenticon"
  },
  "Alchemy lab": {
    count: 0,
    basePrice: 20000000000,
    gain: 500,
    description: "Turns gold into cookies!",
    icon: "labicon"
  },
  Portal: {
    count: 0,
    basePrice: 400000000000,
    gain: 6666,
    description: "Opens a door to the Cookieverse.",
    icon: "portalicon"
  },
  "Time machine": {
    count: 0,
    basePrice: 8000000000000,
    gain: 123456,
    description: '<span style="font-size:80%;">Brings cookies from the past, before they were even eaten.</span>',
    icon: "timemachineicon"
  }
};

const multipliers = {};
Object.keys(buildings).forEach(name => multipliers[name] = 1);

const upgrades = {};
const pops = [];

/* ---------------------------------------------------------------- */
/* Building helpers                                                 */
/* ---------------------------------------------------------------- */

function getBuilding(name) {
  return buildings[name];
}

function getBuildingCount(name) {
  return getBuilding(name)?.count || 0;
}

function getBuildingPrice(name) {
  const building = getBuilding(name);
  return building.currentPrice;
}

function updateBuildingPrice(name) {
  const building = getBuilding(name);
  building.currentPrice = Math.ceil(
    building.basePrice * Math.pow(1.1, building.count)
  );
}

function initializeBuildingPrices() {
  Object.keys(buildings).forEach(updateBuildingPrice);
}

function createBuilding(name, options) {
  buildings[name] = {
    count: 0,
    basePrice: options.basePrice,
    gain: options.gain,
    description: options.description,
    icon: options.icon,
    currentPrice: options.basePrice
  };
  multipliers[name] = 1;
}

/* ---------------------------------------------------------------- */
/* Save and load                                                    */
/* ---------------------------------------------------------------- */

function getSaveData() {
  const buildingData = {};

  Object.keys(buildings).forEach(name => {
    buildingData[name] = {
      count: buildings[name].count,
      price: buildings[name].currentPrice
    };
  });

  return {
    formatVersion: SAVE_FORMAT_VERSION,
    gameVersion: VERSION,
    cookies: Math.floor(cookies),
    prestige,
    pledge,
    buildings: buildingData,
    upgrades: Object.keys(upgrades).filter(name => upgrades[name].bought)
  };
}

function makeSaveString() {
  return JSON.stringify(getSaveData());
}

function resetSaveString() {
  const data = {
    formatVersion: SAVE_FORMAT_VERSION,
    gameVersion: VERSION,
    cookies: 0,
    prestige,
    pledge: 0,
    buildings: {},
    upgrades: []
  };

  Object.keys(buildings).forEach(name => {
    data.buildings[name] = {
      count: 0,
      price: buildings[name].basePrice
    };
  });

  return JSON.stringify(data);
}

function applySaveData(data) {
  if (!data || typeof data !== "object") return false;
  if (data.formatVersion !== SAVE_FORMAT_VERSION) return false;

  cookies = Number.isFinite(data.cookies) ? data.cookies : 0;
  prestige = Number.isFinite(data.prestige) ? data.prestige : 0;
  pledge = Number.isFinite(data.pledge) ? data.pledge : 0;

  Object.keys(buildings).forEach(name => {
    const saved = data.buildings?.[name];
    const building = buildings[name];

    building.count = Math.min(
      MAX_BUILDING_COUNT,
      Math.max(0, Number.parseInt(saved?.count ?? 0, 10))
    );

    building.currentPrice = Number.isFinite(saved?.price)
      ? saved.price
      : building.basePrice;

    if (building.currentPrice < building.basePrice) {
      building.currentPrice = building.basePrice;
    }
  });

  Object.keys(upgrades).forEach(name => {
    upgrades[name].bought = false;
  });

  Object.keys(multipliers).forEach(name => {
    multipliers[name] = 1;
  });

  (data.upgrades || []).forEach(name => {
    const upgrade = upgrades[name];
    if (!upgrade) return;

    upgrade.bought = true;
    multipliers[upgrade.building] *= upgrade.multiplier;
  });

  refreshAllBuildingVisuals();
  storeToRebuild = true;
  upgradesToRebuild = true;
  return true;
}

function applyLegacySaveString(str) {
  const values = str.split("|");
  if (!str || values[0] !== "1") return false;

  const readInt = index => {
    const value = Number.parseInt(values[index], 10);
    return Number.isFinite(value) ? value : 0;
  };

  cookies = readInt(2);

  const legacyOrder = [
    "Cursor", "Grandma", "Farm", "Mine", "Factory", "Bank",
    "Temple", "Wizard tower", "Shipment", "Alchemy lab",
    "Portal", "Time machine"
  ];

  let index = 3;

  legacyOrder.forEach(name => {
    const building = buildings[name];
    building.count = Math.min(MAX_BUILDING_COUNT, Math.max(0, readInt(index)));
    building.currentPrice = Math.max(
      building.basePrice,
      readInt(index + 1) || building.basePrice
    );
    index += 2;
  });

  const upgradeNames = values[index] ? values[index].split(",").filter(Boolean) : [];
  index++;

  Object.keys(upgrades).forEach(name => upgrades[name].bought = false);
  Object.keys(multipliers).forEach(name => multipliers[name] = 1);

  upgradeNames.forEach(name => {
    const upgrade = upgrades[name];
    if (!upgrade) return;
    upgrade.bought = true;
    multipliers[upgrade.building] *= upgrade.multiplier;
  });

  index++;
  index++;
  prestige = readInt(index);

  refreshAllBuildingVisuals();
  storeToRebuild = true;
  upgradesToRebuild = true;
  return true;
}

function applySaveString(str) {
  if (!str || str === "0") return false;

  try {
    const data = JSON.parse(str);
    return applySaveData(data);
  } catch {
    return applyLegacySaveString(str);
  }
}

function saveGameToLocalStorage() {
  localStorage.setItem(SAVE_KEY, makeSaveString());
}

function loadGameFromLocalStorage() {
  const savedData = localStorage.getItem(SAVE_KEY);
  if (!savedData) return false;
  return applySaveString(savedData);
}

function saveGameToCookie() {
  const saveString = makeSaveString();
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 5);

  document.cookie =
    `${COOKIE_SAVE_NAME}=${encodeURIComponent(saveString)}; expires=${expiry.toUTCString()}; path=/;`;

  saveTimer = SAVE_INTERVAL_SECONDS;
}

function loadGameFromCookie() {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_SAVE_NAME}=([^;]*)`)
  );

  if (!match) return false;

  try {
    return applySaveString(decodeURIComponent(match[1]));
  } catch {
    return false;
  }
}

function saveGame() {
  saveGameToLocalStorage();
  saveGameToCookie();
  new Pop("credits", "Saved");
}

function loadGame() {
  const loadedFromLocalStorage = loadGameFromLocalStorage();

  if (!loadedFromLocalStorage) {
    loadGameFromCookie();
  }

  loaded = true;
  getElement("comment").innerHTML = "Ready.";
  main();
}

function exportSave() {
  prompt(
    "Copy this text and keep it somewhere safe! (yes, it's easy to edit — but remember: cheated cookies taste terrible!)",
    makeSaveString()
  );
}

function importSave() {
  const save = prompt(
    "Please paste in the text that was given to you on save export.",
    ""
  );

  if (!save) return;

  if (applySaveString(save)) {
    saveGameToLocalStorage();
    saveGameToCookie();
    new Pop("credits", "Imported.");
  } else {
    new Pop("credits", "Invalid save.");
  }
}

function resetGame() {
  if (!confirm("Do you REALLY want to start over?")) return;

  prestige += calculatePrestige();

  localStorage.setItem(SAVE_KEY, resetSaveString());

  document.cookie =
    `${COOKIE_SAVE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;

  location.reload();
}

/* ---------------------------------------------------------------- */
/* Cookie clicking                                                  */
/* ---------------------------------------------------------------- */

function getCursorGain() {
  const cursor = buildings.Cursor;
  const base = pledge > 0 ? Math.ceil(cursor.count * 1.5) : 1;
  return base * multipliers.Cursor;
}

function clickCookie() {
  let amount = getCursorGain();
  amount *= prestige + 1;
  cookies += amount;

  if (pops.length < 260 && numbersOn) {
    new Pop("cookie", "+" + amount);
  }
}

function addCookies(amount, elementId) {
  amount *= prestige + 1;
  cookies += amount;

  if (elementId && pops.length < 250 && numbersOn) {
    new Pop(elementId, "+" + amount);
  }
}

/* ---------------------------------------------------------------- */
/* Building rendering                                               */
/* ---------------------------------------------------------------- */

function refreshGrandmas() {
  const count = buildings.Grandma.count;
  let output = "";

  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * 20 + (i % 10) * 24);
    const y = Math.floor(Math.random() * 20 + Math.floor(i / 10) * 24);
    let className = "";

    if (buildings["Alchemy lab"].count && Math.random() < 0.2) className = "goldengrandma";
    if (buildings.Factory.count && Math.random() < 0.2) className = "factorygrandma";
    if (buildings.Mine.count && Math.random() < 0.2) className = "minegrandma";
    if (buildings.Shipment.count && Math.random() < 0.2) className = "shipmentgrandma";
    if (buildings.Portal.count && pledge <= 0 && Math.random() < 0.2) className = "portalgrandma";
    if (buildings["Time machine"].count && Math.random() < 0.2) className = "timegrandma";
    if (pledge && Math.random() < 0.2) className = "pledgedgrandma";

    output += `<div class="${className ? className + " " : ""}grandma" style="left:${x}px;top:${y}px;"></div>`;
  }

  getElement("grandmas").innerHTML = output;
}

function refreshMines() {
  let output = "";

  for (let i = 0; i < buildings.Mine.count; i++) {
    const x = Math.floor(Math.random() * 20 + (i % 10) * 16);
    const y = Math.floor(Math.random() * 20 + Math.floor(i / 10) * 16);
    output += `<div class="mine" style="left:${x}px;top:${y}px;"></div>`;
  }

  getElement("mines").innerHTML = output;
}

function refreshFactories() {
  let output = "";

  for (let i = 0; i < buildings.Factory.count; i++) {
    const x = Math.floor(Math.random() * 20 + (i % 10) * 32);
    const y = Math.floor(Math.random() * 20 + Math.floor(i / 10) * 24);
    output += `<div class="factory" style="right:${x}px;top:${y}px;"></div>`;
  }

  getElement("factories").innerHTML = output;
}

function refreshShipments() {
  let output = "";

  for (let i = 0; i < buildings.Shipment.count; i++) {
    const x = Math.floor(Math.random() * 20 + (i % 10) * 24);
    const y = Math.floor(Math.random() * 20 + Math.floor(i / 10) * 24);
    output += `<div class="shipment" style="right:${x}px;top:${y}px;"></div>`;
  }

  getElement("shipments").innerHTML = output;
}

function refreshLabs() {
  let output = "";

  for (let i = 0; i < buildings["Alchemy lab"].count; i++) {
    const x = Math.floor(Math.random() * 20 + (i % 10) * 24);
    const y = Math.floor(Math.random() * 20 + Math.floor(i / 10) * 16);
    output += `<div class="lab" style="right:${x}px;top:${y}px;"></div>`;
  }

  getElement("labs").innerHTML = output;
}

function refreshPortals() {
  let output = "";

  for (let i = 0; i < buildings.Portal.count; i++) {
    const x = Math.floor(Math.random() * 20 + (i % 10) * 24);
    const y = Math.floor(Math.random() * 20 + Math.floor(i / 10) * 24);
    output += `<div class="portal" style="right:${x}px;top:${y}px;"></div>`;
  }

  getElement("portals").innerHTML = output;
}

function refreshTimeMachines() {
  let output = "";

  for (let i = 0; i < buildings["Time machine"].count; i++) {
    const x = Math.floor(Math.random() * 20 + (i % 10) * 24);
    const y = Math.floor(Math.random() * 20 + Math.floor(i / 10) * 24);
    output += `<div class="time" style="right:${x}px;top:${y}px;"></div>`;
  }

  getElement("times").innerHTML = output;
}

function refreshAllBuildingVisuals() {
  refreshGrandmas();
  refreshMines();
  refreshFactories();
  refreshShipments();
  refreshLabs();
  refreshPortals();
  refreshTimeMachines();
}

function buyBuilding(name) {
  const building = getBuilding(name);

  if (!building || !loaded || cookies < building.currentPrice) return;

  cookies -= building.currentPrice;
  building.count++;
  updateBuildingPrice(name);

  refreshAllBuildingVisuals();
  storeToRebuild = true;
  upgradesToRebuild = true;
}

/* ---------------------------------------------------------------- */
/* Store                                                             */
/* ---------------------------------------------------------------- */

function rebuildStore() {
  let output = "";

  Object.keys(buildings).forEach(name => {
    const building = buildings[name];
    const hidden = "";
    const smallFont = "font-size:90%;";

    output += `
      <div id="buy${name}" data-buy="${name}" style="${hidden}background-image:url(${building.icon}.png);">
        <div class="tooltipStore">
          <div class="building-icon"></div>
          <b>${name}</b>
          <moni></moni> ${beautify(building.currentPrice)}
          ${building.count > 0 ? `<div class="amount">${building.count}</div>` : ""}
          <span class="tooltipTextStore">${building.description}</span>
        </div>
      </div>
    `;
  });

  output += `
    <div id="buyElder Pledge" data-buy="Elder Pledge" style="display:none;background-image:url(pledgeicon.png);">
      <div class="building-icon"></div>
      <b>Elder Pledge - <moni></moni> ${beautify(6666666)}</b>
      <span style="font-size:80%;">Puts an end to the Ancients' wrath, at least for a while.</span>
    </div>
  `;

  getElement("store").innerHTML = output;

  getElement("store").querySelectorAll("[data-buy]").forEach(element => {
    element.addEventListener("click", () => {
      if (element.dataset.buy === "Elder Pledge") {
        buyElderPledge();
      } else {
        buyBuilding(element.dataset.buy);
      }
    });
  });

  storeToRebuild = false;
}

/* ---------------------------------------------------------------- */
/* Elder Pledge                                                     */
/* ---------------------------------------------------------------- */

function buyElderPledge() {
  const price = 6666666;

  if (!loaded || pledge > 0 || cookies < price) return;

  cookies -= price;
  pledge += 30 * 60 * 10;

  refreshGrandmas();
  storeToRebuild = true;
}

/* ---------------------------------------------------------------- */
/* Upgrades                                                         */
/* ---------------------------------------------------------------- */

function createUpgrade(name, description, price, building, requiredCount, multiplier = 2) {
  upgrades[name] = {
    name,
    description,
    price,
    building,
    requiredCount,
    multiplier,
    bought: false
  };
}

function buyUpgrade(name) {
  const upgrade = upgrades[name];

  if (!upgrade || upgrade.bought || !loaded || cookies < upgrade.price) return;

  cookies -= upgrade.price;
  upgrade.bought = true;
  multipliers[upgrade.building] *= upgrade.multiplier;

  upgradesToRebuild = true;
  new Pop("store_upgrades", upgrade.name + " bought!");
}

function rebuildUpgradesStore() {
  let output = "";
  let visibleCount = 0;

  Object.keys(upgrades).forEach(name => {
    const upgrade = upgrades[name];
    const buyable = getBuildingCount(upgrade.building) >= upgrade.requiredCount;
    const smallFont = "font-size:80%;";

    if (upgrade.bought || !buyable) return;

    const classes = visibleCount < MAX_VISIBLE_UPGRADES ? "" : "hidden";
    visibleCount++;

    output += `
      <div id="upgrade${name}" data-upgrade="${name}" class="${classes}" style="${smallFont}background-image:url(${upgrade.building}icon.png);">
        <div class="building-icon"></div>
        <b>${upgrade.name}</b>
        <moni></moni> ${beautify(upgrade.price)}
        <span class="tooltipTextStore">${upgrade.description}</span>
      </div>
    `;
  });

  getElement("store_upgrades").innerHTML = output;

  getElement("store_upgrades").querySelectorAll("[data-upgrade]").forEach(element => {
    element.addEventListener("click", () => buyUpgrade(element.dataset.upgrade));
  });

  upgradesToRebuild = false;
}

/* Cursor upgrades */
createUpgrade("Reinforced index finger", "Cursors x2.", 100, "Cursor", 1);
createUpgrade("Carpal tunnel prevention cream", "Cursors x2.", 500, "Cursor", 1);
createUpgrade("Ambidextrous", "Cursors x2.", 10000, "Cursor", 10);

/* Grandma upgrades */
createUpgrade("Forwards from grandma", "Grandmas x2.", 1000, "Grandma", 1);
createUpgrade("Steel-plated rolling pins", "Grandmas x2.", 5000, "Grandma", 5);
createUpgrade("Lubricated dentures", "Grandmas x2.", 50000, "Grandma", 25);
createUpgrade("Prune juice", "Grandmas x2.", 5000000, "Grandma", 50);
createUpgrade("Double-thick glasses", "Grandmas x2.", 500000000, "Grandma", 100);
createUpgrade("Aging agents", "Grandmas x2.", 50000000000, "Grandma", 150);
createUpgrade("Xtreme walkers", "Grandmas x2.", 50000000000000, "Grandma", 200);

/* Farm upgrades */
createUpgrade("Cheap hoes", "Farms x2.", 11000, "Farm", 1);
createUpgrade("Fertilizer", "Farms x2.", 55000, "Farm", 5);
createUpgrade("Cookie trees", "Farms x2.", 550000, "Farm", 25);
createUpgrade("Genetically-modified cookies", "Farms x2.", 55000000, "Farm", 50);
createUpgrade("Gingerbread scarecrows", "Farms x2.", 5500000000, "Farm", 100);
createUpgrade("Pulsar sprinklers", "Farms x2.", 550000000000, "Farm", 150);
createUpgrade("Fudge fungus", "Farms x2.", 550000000000000, "Farm", 200);

/* Mine upgrades */
createUpgrade("Sugar gas", "Mines x2.", 120000, "Mine", 1);
createUpgrade("Megadrill", "Mines x2.", 600000, "Mine", 5);
createUpgrade("Ultradrill", "Mines x2.", 6000000, "Mine", 25);
createUpgrade("Ultimadrill", "Mines x2.", 600000000, "Mine", 50);
createUpgrade("H-bomb mining", "Mines x2.", 60000000000, "Mine", 100);
createUpgrade("Coreforge", "Mines x2.", 6000000000000, "Mine", 150);
createUpgrade("Planetsplitters", "Mines x2.", 6000000000000000, "Mine", 200);

/* Factory upgrades */
createUpgrade("Sturdier conveyor belts", "Factories x2.", 1300000, "Factory", 1);
createUpgrade("Child labor", "Factories x2.", 6500000, "Factory", 5);
createUpgrade("Sweatshop", "Factories x2.", 65000000, "Factory", 25);
createUpgrade("Radium reactors", "Factories x2.", 6500000000, "Factory", 50);
createUpgrade("Recombobulators", "Factories x2.", 650000000000, "Factory", 100);
createUpgrade("Deep-bake process", "Factories x2.", 65000000000000, "Factory", 150);
createUpgrade("Cyborg workforce", "Factories x2.", 65000000000000000, "Factory", 200);

/* Bank upgrades */
createUpgrade("Dizzy miss lizzy", "Banks x2.", 14000000, "Bank", 1);
createUpgrade("A very special dude", "Banks x2.", 70000000, "Bank", 5);
createUpgrade("Acid-proof vaults", "Banks x2.", 700000000, "Bank", 25);
createUpgrade("Chocolate coins", "Banks x2.", 70000000000, "Bank", 50);
createUpgrade("Taller vaults", "Banks x2.", 7000000000000, "Bank", 100);
createUpgrade("Sugar gas bank", "Banks x2.", 700000000000000, "Bank", 150);
createUpgrade("Snack production", "Banks x2.", 700000000000000000, "Bank", 200);

/* Temple upgrades */
createUpgrade("Golden idols", "Temples x2.", 200000000, "Temple", 1);
createUpgrade("Sacrificial rolling pins", "Temples x2.", 1000000000, "Temple", 5);
createUpgrade("Fierce glow", "Temples x2.", 10000000000, "Temple", 25);
createUpgrade("Slaughterhouse", "Temples x2.", 1000000000000, "Temple", 50);
createUpgrade("Theoretic chocolate", "Temples x2.", 100000000000000, "Temple", 100);
createUpgrade("Temple kneading", "Temples x2.", 10000000000000000, "Temple", 150);
createUpgrade("Patience abolished", "Temples x2.", 1000000000000000000, "Temple", 200);

/* Wizard Tower upgrades */
createUpgrade("Pointier hats", "Wizard towers x2.", 3300000000, "Wizard tower", 1);
createUpgrade("Beardier beards", "Wizard towers x2.", 16500000000, "Wizard tower", 5);
createUpgrade("Ancient grimoires", "Wizard towers x2.", 165000000000, "Wizard tower", 25);
createUpgrade("Kitchen curses", "Wizard towers x2.", 16500000000000, "Wizard tower", 50);
createUpgrade("School of sorcery", "Wizard towers x2.", 1650000000000000, "Wizard tower", 100);
createUpgrade("Dark magic", "Wizard towers x2.", 165000000000000000, "Wizard tower", 150);
createUpgrade("Primal chocolate", "Wizard towers x2.", 16500000000000000000, "Wizard tower", 200);

/* Shipment upgrades */
createUpgrade("Vanilla nebulae", "Shipments x2.", 51000000000, "Shipment", 1);
createUpgrade("Wormholes", "Shipments x2.", 255000000000, "Shipment", 5);
createUpgrade("Frequent flyer", "Shipments x2.", 2550000000000, "Shipment", 25);
createUpgrade("Warp drive", "Shipments x2.", 255000000000000, "Shipment", 50);
createUpgrade("Chocolate monoliths", "Shipments x2.", 25500000000000000, "Shipment", 100);
createUpgrade("Generation ship", "Shipments x2.", 2550000000000000000, "Shipment", 150);
createUpgrade("Dyson sphere", "Shipments x2.", 255000000000000000000, "Shipment", 200);

/* Alchemy Lab upgrades */
createUpgrade("Antimony", "Alchemy labs x2.", 750000000000, "Alchemy lab", 1);
createUpgrade("Essence of dough", "Alchemy labs x2.", 3750000000000, "Alchemy lab", 5);
createUpgrade("True chocolate", "Alchemy labs x2.", 37500000000000, "Alchemy lab", 25);
createUpgrade("Ambrosia", "Alchemy labs x2.", 3750000000000000, "Alchemy lab", 50);
createUpgrade("Aqua crustulae", "Alchemy labs x2.", 375000000000000000, "Alchemy lab", 100);
createUpgrade("Origin crucible", "Alchemy labs x2.", 3750000000000000000000, "Alchemy lab", 200);

/* Portal upgrades */
createUpgrade("Elder pact", "Portals x2.", 1000000000000, "Portal", 1);
createUpgrade("Labyrinth", "Portals x2.", 5000000000000, "Portal", 5);
createUpgrade("Neverclick", "Portals x2.", 50000000000000, "Portal", 25);
createUpgrade("Heavenly chip secret", "Portals x2.", 5000000000000000, "Portal", 50);
createUpgrade("Arcane aura", "Portals x2.", 500000000000000000, "Portal", 100);
createUpgrade("The final frontier", "Portals x2.", 50000000000000000000, "Portal", 150);
createUpgrade("Cookie dimensionality", "Portals x2.", 5000000000000000000000, "Portal", 200);

/* Time Machine upgrades */
createUpgrade("Flux capacitor", "Time machines x2.", 14000000000000, "Time machine", 1);
createUpgrade("Time paradox resolver", "Time machines x2.", 70000000000000, "Time machine", 5);
createUpgrade("Quantum chocolatification", "Time machines x2.", 700000000000000, "Time machine", 25);
createUpgrade("Causality enforcer", "Time machines x2.", 70000000000000000, "Time machine", 50);
createUpgrade("Golden verse", "Time machines x2.", 7000000000000000000, "Time machine", 100);
createUpgrade("Eternal cycle", "Time machines x2.", 700000000000000000000, "Time machine", 150);
createUpgrade("Recursive causality", "Time machines x2.", 70000000000000000000000, "Time machine", 200);

/* ---------------------------------------------------------------- */
/* Floating number pops                                             */
/* ---------------------------------------------------------------- */

function Pop(elementId, text) {
  this.elementId = elementId;
  this.text = text;
  this.life = 0;
  this.offsetX = Math.floor(Math.random() * 20 - 10);
  this.offsetY = Math.floor(Math.random() * 20 - 10);
  pops.push(this);
}

/* ---------------------------------------------------------------- */
/* Game loop                                                        */
/* ---------------------------------------------------------------- */

function getGrandmaGain() {
  return Math.ceil(
    4
    + (buildings.Factory.count ? 1 : 0)
    + (buildings.Mine.count ? 2 : 0)
    + (buildings.Shipment.count ? 3 : 0)
    + (buildings["Alchemy lab"].count ? 4 : 0)
    + (buildings.Portal.count ? (pledge ? 5 + buildings.Portal.count * 0.5 : 5) : 0)
    + (buildings["Time machine"].count ? 6 : 0)
  ) * multipliers.Grandma;
}

function getBuildingGain(name) {
  return buildings[name].gain * multipliers[name];
}

function renderPops() {
  let output = "";

  for (let i = pops.length - 1; i >= 0; i--) {
    const pop = pops[i];
    const element = getElement(pop.elementId);
    if (!element) {
      pops.splice(i, 1);
      continue;
    }

    const rect = element.getBoundingClientRect();
    const x = Math.floor((rect.left + rect.right) / 2 + pop.offsetX) - 100;
    const y = Math.floor(
      (rect.top + rect.bottom) / 2
      - Math.pow(pop.life / 100, 0.5) * 100
      + pop.offsetY
    ) - 10;
    const opacity = 1 - (Math.max(pop.life, 80) - 80) / 20;

    output += `
      <div class="pop"
        style="position:absolute;left:${x}px;top:${y}px;opacity:${opacity};">
        ${pop.text}
      </div>
    `;

    pop.life += 2;
    if (pop.life >= 100) pops.splice(i, 1);
  }

  getElement("pops").innerHTML = output;
}

function renderCursors() {
  let output = "";
  const count = buildings.Cursor.count;

  if (!count) {
    getElement("cookie").innerHTML = "";
    return;
  }

  for (let i = 0; i < count; i++) {
    const rotation = -Math.floor((360 / count) * i);
    let x = Math.floor(64 + Math.sin((Math.PI * 2 / count) * i) * 64) - 16;
    let y = Math.floor(64 + Math.cos((Math.PI * 2 / count) * i) * 64) - 16;

    if (ticks % 150 === Math.ceil((150 / count) * i)) y += 2;

    output += `
      <div class="cursor"
        style="left:${x}px;top:${y}px;transform:rotate(${rotation}deg);">
      </div>
    `;
  }

  getElement("cookie").innerHTML = output;
}

function produceBuildingCookies(name, elementId) {
  const count = buildings[name].count;
  if (!count) return;

  const interval = Math.max(1, Math.ceil(150 / count));

  if (ticks % interval === 0) {
    addCookies(getBuildingGain(name), elementId);
  }
}

function getCookiesPerSecond() {
  let cps = 0;

  Object.keys(buildings).forEach(name => {
    cps += buildings[name].count * getBuildingGain(name) / 5;
  });

  return cps * (prestige + 1);
}

function updateStoreAffordability() {
  Object.keys(buildings).forEach(name => {
    const element = getElement("buy" + name);
    if (!element) return;

    element.classList.toggle(
      "grayed",
      cookies < buildings[name].currentPrice
    );
  });

  const pledgeElement = getElement("buyElder Pledge");
  if (pledgeElement) {
    pledgeElement.classList.toggle("grayed", cookies < 6666666);
  }
}

function updateUpgradeAffordability() {
  Object.keys(upgrades).forEach(name => {
    const upgrade = upgrades[name];
    const element = getElement("upgrade" + name);

    if (!element || upgrade.bought || element.classList.contains("hidden")) return;

    element.classList.toggle("grayed", cookies < upgrade.price);
  });
}

function updatePledgeTimer() {
  if (pledge > 0) {
    pledge--;

    const secondsLeft = Math.ceil(pledge / TICKS_PER_SECOND);
    const minutes = Math.floor(secondsLeft / 60);
    let seconds = secondsLeft % 60;

    if (seconds < 10) seconds = "0" + seconds;

    getElement("pledgeTimer").innerHTML = minutes + ":" + seconds;
  } else {
    getElement("pledgeTimer").innerHTML = "00:00";
  }
}

function main() {
  if (storeToRebuild) rebuildStore();
  if (upgradesToRebuild) rebuildUpgradesStore();

  renderPops();
  renderCursors();

  produceBuildingCookies("Time machine", "times");
  produceBuildingCookies("Portal", "portals");
  produceBuildingCookies("Alchemy lab", "labs");
  produceBuildingCookies("Shipment", "shipments");
  produceBuildingCookies("Wizard tower", "middle");
  produceBuildingCookies("Temple", "middle");
  produceBuildingCookies("Bank", "middle");
  produceBuildingCookies("Factory", "factories");
  produceBuildingCookies("Mine", "mines");
  produceBuildingCookies("Farm", "middle");
  produceBuildingCookies("Grandma", "grandmas");

  if (
    buildings.Cursor.count &&
    ticks % Math.max(1, Math.ceil(150 / buildings.Cursor.count)) === 0
  ) {
    clickCookie();
  }

  const cps = getCookiesPerSecond();
  const floater = Math.round(cps * 10 - Math.floor(cps) * 10);

  getElement("cps").innerHTML =
    "Cookies per second : " +
    beautify(cps) +
    (floater ? "." + floater : "");

  updateStoreAffordability();
  updateUpgradeAffordability();

  cookiesDisplay += (cookies - cookiesDisplay) * 0.5;
  getElement("money").innerHTML = beautify(Math.round(cookiesDisplay));
  getElement("comment").innerHTML = getComment(cookies);

  updatePledgeTimer();

  getElement("prestigeDisplay").innerHTML = prestige;
  getElement("prestigeGainDisplay").innerHTML = calculatePrestige();

  applyFlashEffect();

  if (ticks % 30 === 0 && loaded) {
    document.title = beautify(cookies) + " cookies - Cookie Clicker";
  }

  saveTimer--;
  if (saveTimer <= 0 && loaded) saveGame();

  ticks++;
  setTimeout(main, 1000 / TICKS_PER_SECOND);
}

/* ---------------------------------------------------------------- */
/* Flavor text and visual effects                                   */
/* ---------------------------------------------------------------- */

function getComment(totalCookies) {
  const milestones = [
    [5, "You feel like making cookies.<br>But nobody wants to eat your cookies."],
    [25, "Your cookies are popular<br>with your dog."],
    [50, "Your cookies are popular<br>with your family."],
    [100, "Your cookies are popular<br>in the neighborhood."],
    [500, "Your cookies are renowned<br>in the whole town!"],
    [2000, "Your cookies are worth<br>a lot of money."],
    [5000, "Your cookies bring<br>all the boys to the yard."],
    [10000, "People come from very far away<br>to get a taste of your cookies."],
    [17000, "Kings and queens from all over the world<br>are enjoying your cookies."],
    [30000, "Your cookies have been named<br>a part of the world wonders."],
    [60000, "Your cookies have been placed<br>under government surveillance."],
    [100000, "The whole planet is<br>enjoying your cookies!"],
    [150000, "Creatures from neighboring planets<br>wish to try your cookies."],
    [250000, "Elder gods from the whole cosmos<br>have awoken to taste your cookies."],
    [400000, "Your cookies have achieved sentience."],
    [1000000, "The universe has now turned into<br>cookie dough, to the molecular level."],
    [1000000000, 'A local news station runs<br>a 10-minute segment about your cookies. Success!<br><span style="font-size:50%;">(you win a cookie)</span>']
  ];

  for (const [threshold, text] of milestones) {
    if (totalCookies < threshold) return text;
  }

  return 'it\'s time to stop playing<br><span style="font-size:50%;">(more fun milestones in the next update I promise)</span>';
}

function applyFlashEffect() {
  const whole = getElement("whole");

  if (cookies >= 1000000 && pledge <= 0 && flashing) {
    const intensity = (cookies - 1000000) / 2000000;
    const intensity2 = Math.max(0, (cookies - 100000000) / 400000000);
    let icon = "grandmaicon";

    if (cookies >= 2000000) {
      const pledgeButton = getElement("buyElder Pledge");
      if (pledgeButton) pledgeButton.style.display = "block";

      if (Math.random() < 0.02) icon = "grandmaiconinvert";
      else if (Math.random() < 0.02) icon = "grandmaiconlustful";
    }

    if (cookies >= 10000000 && Math.random() < 0.02) icon = "skellington";

    if (cookies >= 1000000000) {
      whole.style.background =
        `url(kaleigrandma.png) ${Math.floor(ticks * 0.2)}px -${Math.floor(ticks * 0.1)}px`;
    } else if (Math.random() < intensity) {
      whole.style.background =
        `url(${icon}.png) ${Math.floor(Math.random() * 4)}px ${Math.floor(Math.random() * 4)}px`;
      whole.style.backgroundSize =
        `${Math.floor(intensity2 * Math.random() * 64 + 64)}px ` +
        `${Math.floor(intensity2 * Math.random() * 64 + 64)}px`;
    }
  } else {
    whole.style.background = "#ccc";
  }
}

function calculatePrestige() {
  return Math.max(
    0,
    Math.floor(
      (-1 + Math.sqrt(1 + 8 * (cookies / 100000000))) / 2
    )
  );
}

/* ---------------------------------------------------------------- */
/* UI controls                                                      */
/* ---------------------------------------------------------------- */

function toggleNumbers() {
  numbersOn = !numbersOn;
  getElement("toggleNumbers").innerHTML =
    numbersOn ? "Numbers On" : "Numbers Off";
}

function toggleFlash() {
  flashing = !flashing;
  getElement("toggleFlash").innerHTML =
    flashing ? "Flashing On" : "Flashing Off";
}

/* ---------------------------------------------------------------- */
/* Initialization                                                   */
/* ---------------------------------------------------------------- */

function initialize() {
  initializeBuildingPrices();

  getElement("version").innerHTML = "running v." + VERSION;

  const imageNames = [
    "cursor", "grandma", "mine", "factory", "lab", "shipment",
    "goldengrandma", "grandmaiconinvert", "grandmaiconlustful",
    "portal", "skellington", "kaleigrandma", "factorygrandma",
    "minegrandma", "shipmentgrandma", "portalgrandma",
    "pledgedgrandma", "timemachine", "timegrandma"
  ];

  getElement("hiddenLoader").innerHTML =
    imageNames.map(name => `<img src="${name}.png">`).join("");

  getElement("cookie").addEventListener("mouseup", clickCookie);
  getElement("exportSave").addEventListener("click", exportSave);
  getElement("importSave").addEventListener("click", importSave);
  getElement("reset").addEventListener("click", resetGame);
  getElement("toggleNumbers").addEventListener("click", toggleNumbers);
  getElement("toggleFlash").addEventListener("click", toggleFlash);

  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveGame();
    }
  });

  loadGame();
}

window.addEventListener("load", initialize);
