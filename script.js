"use strict";

/* ---------------------------------------------------------------- */
/* DOM and formatting helpers                                      */
/* ---------------------------------------------------------------- */

const VERSION = "0.131a";
const SAVE_KEY = "CookieClickerClassic_Reborn_Save";
const SAVE_FORMAT_VERSION = 2;
const TICKS_PER_SECOND = 30;
const SAVE_INTERVAL_SECONDS = 30 * 60;
const MAX_VISIBLE_UPGRADES = 5;

const elderPledge = {
  basePrice: 6666666,
  currentPrice: 6666666,
  count: 0
};

function getElement(id) {
  return document.getElementById(id);
}

function beautify(value) {
  const digits = Math.floor(value).toString().split("").reverse();
  let output = "";

  digits.forEach((digit, index) => {
    if (index % 3 === 0 && index > 0) output = " " + output;
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
let cookiesBakedAllTime = 0;
let cookiesDisplay = 0;
let ticks = 0;
let prestige = 0;
let pledge = 0;
let saveTimer = SAVE_INTERVAL_SECONDS;
let resetCount = 0;

let goldenCookieVisible = false;
let goldenCookieTimer = null;
let goldenCookieTimeout = null;
let goldenCookieSpawnMultiplier = 1;
let goldenCookieDurationMultiplier = 1;
let goldenCookieCpsMultiplier = 1;
let goldenCookieFrenzyTimer = 0;
let goldenCookieClickMultiplier = 1;
let goldenCookieClickFrenzyTimer = 0;

const buildings = {
  Cursor: {
    id: 0,
    count: 0,
    basePrice: 15,
    gain: 1,
    description: "Autoclicks every 5 seconds.",
    icon: "cursoricon"
  },
  Grandma: {
    id: 1,
    count: 0,
    basePrice: 100,
    gain: 4,
    description: "A nice grandma to bake more cookies.",
    icon: "grandmaicon"
  },
  Farm: {
    id: 2,
    count: 0,
    basePrice: 500,
    gain: 20,
    description: "Grows cookie plants from cookie seeds.",
    icon: "farmicon"
  },
  Mine: {
    id: 3,
    count: 0,
    basePrice: 2000,
    gain: 50,
    description: "Mines out cookie dough and chocolate chips.",
    icon: "mineicon"
  },
  Factory: {
    id: 4,
    count: 0,
    basePrice: 7000,
    gain: 100,
    description: "Produces large quantities of cookies.",
    icon: "factoryicon"
  },
  Bank: {
    id: 5,
    count: 0,
    basePrice: 50000,
    gain: 250,
    description: "Generates cookies from interest.",
    icon: "bankicon"
  },
  Temple: {
    id: 6,
    count: 0,
    basePrice: 1000000,
    gain: 390,
    description: "Full of precious, ancient chocolate.",
    icon: "templeicon"
  },
  "Wizard tower": {
    id: 7,
    count: 0,
    basePrice: 123456789,
    gain: 123456,
    description: "Summons cookies with magic spells.",
    icon: "wizardtowericon"
  },
  Shipment: {
    id: 8,
    count: 0,
    basePrice: 1000000000,
    gain: 5000000,
    description: "Brings in fresh cookies from the cookie planet.",
    icon: "shipmenticon"
  },
  "Alchemy lab": {
    id: 9,
    count: 0,
    basePrice: 2500000000,
    gain: 25000,
    description: "Turns gold into cookies!",
    icon: "labicon"
  },
  Portal: {
    id: 10,
    count: 0,
    basePrice: 420000000000,
    gain: 20000000,
    description: "Opens a door to the Cookieverse.",
    icon: "portalicon"
  },
  "Time machine": {
    id: 11,
    count: 0,
    basePrice: 8000000000000,
    gain: 200000000,
    description: '<span style="font-size:80%;">Brings cookies from the past, before they were even eaten.</span>',
    icon: "timemachineicon"
  }
};

const multipliers = {};
Object.keys(buildings).forEach(name => multipliers[name] = 1);

const pops = [];

const achievementTypes = {
  cps: {
    getProgress() {
      return getCookiesPerSecond();
    }
  },

  buildings: {
    getProgress(achievement) {
      return getBuildingCount(achievement.target);
    }
  },

  cookies: {
    getProgress() {
      return cookies;
    }
  },

  grandTotal: {
    getProgress() {
      // TODO: implement grandTotal
      return 0;
    }
  },

  resets: {
    getProgress() {
      // TODO: implement reset count
      return 0;
    }
  }
};

const achievements = {
  "Casual baking": { id: 0, type: "cps", requirement: 1, description: "Bake 1 cookie per second.", unlocked: false },
  "Hardcore baking": { id: 1, type: "cps", requirement: 10, description: "Bake 10 cookies per second.", unlocked: false },
  "Steady tasty stream": { id: 2, type: "cps", requirement: 100, description: "Bake 100 cookies per second.", unlocked: false },
  "Cookie monster": { id: 3, type: "cps", requirement: 1000, description: "Bake 1,000 cookies per second.", unlocked: false },
  "Mass producer": { id: 4, type: "cps", requirement: 10000, description: "Bake 10,000 cookies per second.", unlocked: false },
  "Cookie vortex": { id: 5, type: "cps", requirement: 1000000, description: "Bake 1 million cookies per second.", unlocked: false },

  "One finger": { id: 6, type: "buildings", target: "Cursor", requirement: 1, description: "Have 1 Cursor.", unlocked: false },
  "A handful of fingers": { id: 7, type: "buildings", target: "Cursor", requirement: 5, description: "Have 5 Cursors.", unlocked: false },
  "Ten fingers": { id: 8, type: "buildings", target: "Cursor", requirement: 10, description: "Have 10 Cursors.", unlocked: false },
  "Many fingers": { id: 9, type: "buildings", target: "Cursor", requirement: 20, description: "Have 20 Cursors.", unlocked: false },
  "Finger army": { id: 10, type: "buildings", target: "Cursor", requirement: 50, description: "Have 50 Cursors.", unlocked: false },

  "First grandma": { id: 11, type: "buildings", target: "Grandma", requirement: 1, description: "Have 1 Grandma.", unlocked: false },
  "Grandma's kitchen": { id: 12, type: "buildings", target: "Grandma", requirement: 5, description: "Have 5 Grandmas.", unlocked: false },
  "Grandma's house": { id: 13, type: "buildings", target: "Grandma", requirement: 10, description: "Have 10 Grandmas.", unlocked: false },
  "Grandma's village": { id: 14, type: "buildings", target: "Grandma", requirement: 20, description: "Have 20 Grandmas.", unlocked: false },
  "Grandma's empire": { id: 15, type: "buildings", target: "Grandma", requirement: 50, description: "Have 50 Grandmas.", unlocked: false },

  "First harvest": { id: 16, type: "buildings", target: "Farm", requirement: 1, description: "Have 1 Farm.", unlocked: false },
  "Small farm": { id: 17, type: "buildings", target: "Farm", requirement: 5, description: "Have 5 Farms.", unlocked: false },
  "Growing farm": { id: 18, type: "buildings", target: "Farm", requirement: 10, description: "Have 10 Farms.", unlocked: false },
  "Big farm": { id: 19, type: "buildings", target: "Farm", requirement: 20, description: "Have 20 Farms.", unlocked: false },
  "Cookie plantation": { id: 20, type: "buildings", target: "Farm", requirement: 50, description: "Have 50 Farms.", unlocked: false },

  "First mine": { id: 21, type: "buildings", target: "Mine", requirement: 1, description: "Have 1 Mine.", unlocked: false },
  "Small operation": { id: 22, type: "buildings", target: "Mine", requirement: 5, description: "Have 5 Mines.", unlocked: false },
  "Ten mines": { id: 23, type: "buildings", target: "Mine", requirement: 10, description: "Have 10 Mines.", unlocked: false },
  "Deep mining": { id: 24, type: "buildings", target: "Mine", requirement: 20, description: "Have 20 Mines.", unlocked: false },
  "Cookie extraction": { id: 25, type: "buildings", target: "Mine", requirement: 50, description: "Have 50 Mines.", unlocked: false },

  "First factory": { id: 26, type: "buildings", target: "Factory", requirement: 1, description: "Have 1 Factory.", unlocked: false },
  "Small industry": { id: 27, type: "buildings", target: "Factory", requirement: 5, description: "Have 5 Factories.", unlocked: false },
  "Mass production": { id: 28, type: "buildings", target: "Factory", requirement: 10, description: "Have 10 Factories.", unlocked: false },
  "Industrial complex": { id: 29, type: "buildings", target: "Factory", requirement: 20, description: "Have 20 Factories.", unlocked: false },
  "Cookie industry": { id: 30, type: "buildings", target: "Factory", requirement: 50, description: "Have 50 Factories.", unlocked: false },

  "First investment": { id: 31, type: "buildings", target: "Bank", requirement: 1, description: "Have 1 Bank.", unlocked: false },
  "Small savings": { id: 32, type: "buildings", target: "Bank", requirement: 5, description: "Have 5 Banks.", unlocked: false },
  "Growing fortune": { id: 33, type: "buildings", target: "Bank", requirement: 10, description: "Have 10 Banks.", unlocked: false },
  "Cookie finance": { id: 34, type: "buildings", target: "Bank", requirement: 20, description: "Have 20 Banks.", unlocked: false },
  "Cookie banking empire": { id: 35, type: "buildings", target: "Bank", requirement: 50, description: "Have 50 Banks.", unlocked: false },

  "First temple": { id: 36, type: "buildings", target: "Temple", requirement: 1, description: "Have 1 Temple.", unlocked: false },
  "Sacred grounds": { id: 37, type: "buildings", target: "Temple", requirement: 5, description: "Have 5 Temples.", unlocked: false },
  "Holy order": { id: 38, type: "buildings", target: "Temple", requirement: 10, description: "Have 10 Temples.", unlocked: false },
  "Grand temple": { id: 39, type: "buildings", target: "Temple", requirement: 20, description: "Have 20 Temples.", unlocked: false },
  "Temple complex": { id: 40, type: "buildings", target: "Temple", requirement: 50, description: "Have 50 Temples.", unlocked: false },

  "First spell": { id: 41, type: "buildings", target: "Wizard tower", requirement: 1, description: "Have 1 Wizard Tower.", unlocked: false },
  "Apprentice wizard": { id: 42, type: "buildings", target: "Wizard tower", requirement: 5, description: "Have 5 Wizard Towers.", unlocked: false },
  "Arcane tower": { id: 43, type: "buildings", target: "Wizard tower", requirement: 10, description: "Have 10 Wizard Towers.", unlocked: false },
  "Magical complex": { id: 44, type: "buildings", target: "Wizard tower", requirement: 20, description: "Have 20 Wizard Towers.", unlocked: false },
  "Wizarding citadel": { id: 45, type: "buildings", target: "Wizard tower", requirement: 50, description: "Have 50 Wizard Towers.", unlocked: false },

  "First shipment": { id: 46, type: "buildings", target: "Shipment", requirement: 1, description: "Have 1 Shipment.", unlocked: false },
  "Small fleet": { id: 47, type: "buildings", target: "Shipment", requirement: 5, description: "Have 5 Shipments.", unlocked: false },
  "Shipping company": { id: 48, type: "buildings", target: "Shipment", requirement: 10, description: "Have 10 Shipments.", unlocked: false },
  "Trade network": { id: 49, type: "buildings", target: "Shipment", requirement: 20, description: "Have 20 Shipments.", unlocked: false },
  "Cookie trade empire": { id: 50, type: "buildings", target: "Shipment", requirement: 50, description: "Have 50 Shipments.", unlocked: false },

  "First experiment": { id: 51, type: "buildings", target: "Alchemy lab", requirement: 1, description: "Have 1 Alchemy Lab.", unlocked: false },
  "Amateur alchemist": { id: 52, type: "buildings", target: "Alchemy lab", requirement: 5, description: "Have 5 Alchemy Labs.", unlocked: false },
  "Alchemy workshop": { id: 53, type: "buildings", target: "Alchemy lab", requirement: 10, description: "Have 10 Alchemy Labs.", unlocked: false },
  "Master laboratory": { id: 54, type: "buildings", target: "Alchemy lab", requirement: 20, description: "Have 20 Alchemy Labs.", unlocked: false },
  "Alchemy empire": { id: 55, type: "buildings", target: "Alchemy lab", requirement: 50, description: "Have 50 Alchemy Labs.", unlocked: false },

  "First portal": { id: 56, type: "buildings", target: "Portal", requirement: 1, description: "Have 1 Portal.", unlocked: false },
  "Portal network": { id: 57, type: "buildings", target: "Portal", requirement: 5, description: "Have 5 Portals.", unlocked: false },
  "Dimensional gateway": { id: 58, type: "buildings", target: "Portal", requirement: 10, description: "Have 10 Portals.", unlocked: false },
  "Interdimensional network": { id: 59, type: "buildings", target: "Portal", requirement: 20, description: "Have 20 Portals.", unlocked: false },
  "Cookie multiverse": { id: 60, type: "buildings", target: "Portal", requirement: 50, description: "Have 50 Portals.", unlocked: false },

  "First trip": { id: 61, type: "buildings", target: "Time machine", requirement: 1, description: "Have 1 Time Machine.", unlocked: false },
  "Time traveler": { id: 62, type: "buildings", target: "Time machine", requirement: 5, description: "Have 5 Time Machines.", unlocked: false },
  "Temporal explorer": { id: 63, type: "buildings", target: "Time machine", requirement: 10, description: "Have 10 Time Machines.", unlocked: false },
  "Time network": { id: 64, type: "buildings", target: "Time machine", requirement: 20, description: "Have 20 Time Machines.", unlocked: false },
  "Master of time": { id: 65, type: "buildings", target: "Time machine", requirement: 50, description: "Have 50 Time Machines.", unlocked: false }
};

const upgrades = {
  // Cursor upgrades
  "Reinforced index finger": { id: 0, description: "Cursors x2.", price: 100, building: "Cursor", requiredCount: 1, multiplier: 2, bought: false },
  "Carpal tunnel prevention cream": { id: 1, description: "Cursors x2.", price: 500, building: "Cursor", requiredCount: 1, multiplier: 2, bought: false },
  "Ambidextrous": { id: 2, description: "Cursors x2.", price: 10000, building: "Cursor", requiredCount: 10, multiplier: 2, bought: false },

  // Grandma upgrades
  "Forwards from grandma": { id: 3, description: "Grandmas x2.", price: 1000, building: "Grandma", requiredCount: 1, multiplier: 2, bought: false },
  "Steel-plated rolling pins": { id: 4, description: "Grandmas x2.", price: 5000, building: "Grandma", requiredCount: 5, multiplier: 2, bought: false },
  "Lubricated dentures": { id: 5, description: "Grandmas x2.", price: 50000, building: "Grandma", requiredCount: 25, multiplier: 2, bought: false },
  "Prune juice": { id: 6, description: "Grandmas x2.", price: 5000000, building: "Grandma", requiredCount: 50, multiplier: 2, bought: false },
  "Double-thick glasses": { id: 7, description: "Grandmas x2.", price: 500000000, building: "Grandma", requiredCount: 100, multiplier: 2, bought: false },
  "Aging agents": { id: 8, description: "Grandmas x2.", price: 50000000000, building: "Grandma", requiredCount: 150, multiplier: 2, bought: false },
  "Xtreme walkers": { id: 9, description: "Grandmas x2.", price: 50000000000000, building: "Grandma", requiredCount: 200, multiplier: 2, bought: false },

  // Farm upgrades
  "Cheap hoes": { id: 10, description: "Farms x2.", price: 11000, building: "Farm", requiredCount: 1, multiplier: 2, bought: false },
  "Fertilizer": { id: 11, description: "Farms x2.", price: 55000, building: "Farm", requiredCount: 5, multiplier: 2, bought: false },
  "Cookie trees": { id: 12, description: "Farms x2.", price: 550000, building: "Farm", requiredCount: 25, multiplier: 2, bought: false },
  "Genetically-modified cookies": { id: 13, description: "Farms x2.", price: 55000000, building: "Farm", requiredCount: 50, multiplier: 2, bought: false },
  "Gingerbread scarecrows": { id: 14, description: "Farms x2.", price: 5500000000, building: "Farm", requiredCount: 100, multiplier: 2, bought: false },
  "Pulsar sprinklers": { id: 15, description: "Farms x2.", price: 550000000000, building: "Farm", requiredCount: 150, multiplier: 2, bought: false },
  "Fudge fungus": { id: 16, description: "Farms x2.", price: 550000000000000, building: "Farm", requiredCount: 200, multiplier: 2, bought: false },

  // Mine upgrades
  "Sugar gas": { id: 17, description: "Mines x2.", price: 120000, building: "Mine", requiredCount: 1, multiplier: 2, bought: false },
  "Megadrill": { id: 18, description: "Mines x2.", price: 600000, building: "Mine", requiredCount: 5, multiplier: 2, bought: false },
  "Ultradrill": { id: 19, description: "Mines x2.", price: 6000000, building: "Mine", requiredCount: 25, multiplier: 2, bought: false },
  "Ultimadrill": { id: 20, description: "Mines x2.", price: 600000000, building: "Mine", requiredCount: 50, multiplier: 2, bought: false },
  "H-bomb mining": { id: 21, description: "Mines x2.", price: 60000000000, building: "Mine", requiredCount: 100, multiplier: 2, bought: false },
  "Coreforge": { id: 22, description: "Mines x2.", price: 6000000000000, building: "Mine", requiredCount: 150, multiplier: 2, bought: false },
  "Planetsplitters": { id: 23, description: "Mines x2.", price: 6000000000000000, building: "Mine", requiredCount: 200, multiplier: 2, bought: false },

  // Factory upgrades
  "Sturdier conveyor belts": { id: 24, description: "Factories x2.", price: 1300000, building: "Factory", requiredCount: 1, multiplier: 2, bought: false },
  "Child labor": { id: 25, description: "Factories x2.", price: 6500000, building: "Factory", requiredCount: 5, multiplier: 2, bought: false },
  "Sweatshop": { id: 26, description: "Factories x2.", price: 65000000, building: "Factory", requiredCount: 25, multiplier: 2, bought: false },
  "Radium reactors": { id: 27, description: "Factories x2.", price: 6500000000, building: "Factory", requiredCount: 50, multiplier: 2, bought: false },
  "Recombobulators": { id: 28, description: "Factories x2.", price: 650000000000, building: "Factory", requiredCount: 100, multiplier: 2, bought: false },
  "Deep-bake process": { id: 29, description: "Factories x2.", price: 65000000000000, building: "Factory", requiredCount: 150, multiplier: 2, bought: false },
  "Cyborg workforce": { id: 30, description: "Factories x2.", price: 65000000000000000, building: "Factory", requiredCount: 200, multiplier: 2, bought: false },

  // Bank upgrades
  "Dizzy miss lizzy": { id: 31, description: "Banks x2.", price: 14000000, building: "Bank", requiredCount: 1, multiplier: 2, bought: false },
  "A very special dude": { id: 32, description: "Banks x2.", price: 70000000, building: "Bank", requiredCount: 5, multiplier: 2, bought: false },
  "Acid-proof vaults": { id: 33, description: "Banks x2.", price: 700000000, building: "Bank", requiredCount: 25, multiplier: 2, bought: false },
  "Chocolate coins": { id: 34, description: "Banks x2.", price: 70000000000, building: "Bank", requiredCount: 50, multiplier: 2, bought: false },
  "Taller vaults": { id: 35, description: "Banks x2.", price: 7000000000000, building: "Bank", requiredCount: 100, multiplier: 2, bought: false },
  "Sugar gas bank": { id: 36, description: "Banks x2.", price: 700000000000000, building: "Bank", requiredCount: 150, multiplier: 2, bought: false },
  "Snack production": { id: 37, description: "Banks x2.", price: 700000000000000000, building: "Bank", requiredCount: 200, multiplier: 2, bought: false },

  // Temple upgrades
  "Golden idols": { id: 38, description: "Temples x2.", price: 200000000, building: "Temple", requiredCount: 1, multiplier: 2, bought: false },
  "Sacrificial rolling pins": { id: 39, description: "Temples x2.", price: 1000000000, building: "Temple", requiredCount: 5, multiplier: 2, bought: false },
  "Fierce glow": { id: 40, description: "Temples x2.", price: 10000000000, building: "Temple", requiredCount: 25, multiplier: 2, bought: false },
  "Slaughterhouse": { id: 41, description: "Temples x2.", price: 1000000000000, building: "Temple", requiredCount: 50, multiplier: 2, bought: false },
  "Theoretic chocolate": { id: 42, description: "Temples x2.", price: 100000000000000, building: "Temple", requiredCount: 100, multiplier: 2, bought: false },
  "Temple kneading": { id: 43, description: "Temples x2.", price: 10000000000000000, building: "Temple", requiredCount: 150, multiplier: 2, bought: false },
  "Patience abolished": { id: 44, description: "Temples x2.", price: 1000000000000000000, building: "Temple", requiredCount: 200, multiplier: 2, bought: false },

  // Wizard Tower upgrades
  "Pointier hats": { id: 45, description: "Wizard towers x2.", price: 3300000000, building: "Wizard tower", requiredCount: 1, multiplier: 2, bought: false },
  "Beardier beards": { id: 46, description: "Wizard towers x2.", price: 16500000000, building: "Wizard tower", requiredCount: 5, multiplier: 2, bought: false },
  "Ancient grimoires": { id: 47, description: "Wizard towers x2.", price: 165000000000, building: "Wizard tower", requiredCount: 25, multiplier: 2, bought: false },
  "Kitchen curses": { id: 48, description: "Wizard towers x2.", price: 16500000000000, building: "Wizard tower", requiredCount: 50, multiplier: 2, bought: false },
  "School of sorcery": { id: 49, description: "Wizard towers x2.", price: 1650000000000000, building: "Wizard tower", requiredCount: 100, multiplier: 2, bought: false },
  "Dark magic": { id: 50, description: "Wizard towers x2.", price: 165000000000000000, building: "Wizard tower", requiredCount: 150, multiplier: 2, bought: false },
  "Primal chocolate": { id: 51, description: "Wizard towers x2.", price: 16500000000000000000, building: "Wizard tower", requiredCount: 200, multiplier: 2, bought: false },

  // Shipment upgrades
  "Vanilla nebulae": { id: 52, description: "Shipments x2.", price: 51000000000, building: "Shipment", requiredCount: 1, multiplier: 2, bought: false },
  "Wormholes": { id: 53, description: "Shipments x2.", price: 255000000000, building: "Shipment", requiredCount: 5, multiplier: 2, bought: false },
  "Frequent flyer": { id: 54, description: "Shipments x2.", price: 2550000000000, building: "Shipment", requiredCount: 25, multiplier: 2, bought: false },
  "Warp drive": { id: 55, description: "Shipments x2.", price: 255000000000000, building: "Shipment", requiredCount: 50, multiplier: 2, bought: false },
  "Chocolate monoliths": { id: 56, description: "Shipments x2.", price: 25500000000000000, building: "Shipment", requiredCount: 100, multiplier: 2, bought: false },
  "Generation ship": { id: 57, description: "Shipments x2.", price: 2550000000000000000, building: "Shipment", requiredCount: 150, multiplier: 2, bought: false },
  "Dyson sphere": { id: 58, description: "Shipments x2.", price: 255000000000000000000, building: "Shipment", requiredCount: 200, multiplier: 2, bought: false },

  // Alchemy Lab upgrades
  "Antimony": { id: 59, description: "Alchemy labs x2.", price: 750000000000, building: "Alchemy lab", requiredCount: 1, multiplier: 2, bought: false },
  "Essence of dough": { id: 60, description: "Alchemy labs x2.", price: 3750000000000, building: "Alchemy lab", requiredCount: 5, multiplier: 2, bought: false },
  "True chocolate": { id: 61, description: "Alchemy labs x2.", price: 37500000000000, building: "Alchemy lab", requiredCount: 25, multiplier: 2, bought: false },
  "Ambrosia": { id: 62, description: "Alchemy labs x2.", price: 3750000000000000, building: "Alchemy lab", requiredCount: 50, multiplier: 2, bought: false },
  "Aqua crustulae": { id: 63, description: "Alchemy labs x2.", price: 375000000000000000, building: "Alchemy lab", requiredCount: 100, multiplier: 2, bought: false },
  "Origin crucible": { id: 64, description: "Alchemy labs x2.", price: 3750000000000000000000, building: "Alchemy lab", requiredCount: 200, multiplier: 2, bought: false },

  // Portal upgrades
  "Elder pact": { id: 65, description: "Portals x2.", price: 1000000000000, building: "Portal", requiredCount: 1, multiplier: 2, bought: false },
  "Labyrinth": { id: 66, description: "Portals x2.", price: 5000000000000, building: "Portal", requiredCount: 5, multiplier: 2, bought: false },
  "Neverclick": { id: 67, description: "Portals x2.", price: 50000000000000, building: "Portal", requiredCount: 25, multiplier: 2, bought: false },
  "Heavenly chip secret": { id: 68, description: "Portals x2.", price: 5000000000000000, building: "Portal", requiredCount: 50, multiplier: 2, bought: false },
  "Arcane aura": { id: 69, description: "Portals x2.", price: 500000000000000000, building: "Portal", requiredCount: 100, multiplier: 2, bought: false },
  "The final frontier": { id: 70, description: "Portals x2.", price: 50000000000000000000, building: "Portal", requiredCount: 150, multiplier: 2, bought: false },
  "Cookie dimensionality": { id: 71, description: "Portals x2.", price: 5000000000000000000000, building: "Portal", requiredCount: 200, multiplier: 2, bought: false },

  // Time Machine upgrades
  "Flux capacitor": { id: 72, description: "Time machines x2.", price: 14000000000000, building: "Time machine", requiredCount: 1, multiplier: 2, bought: false },
  "Time paradox resolver": { id: 73, description: "Time machines x2.", price: 70000000000000, building: "Time machine", requiredCount: 5, multiplier: 2, bought: false },
  "Quantum chocolatification": { id: 74, description: "Time machines x2.", price: 700000000000000, building: "Time machine", requiredCount: 25, multiplier: 2, bought: false },
  "Causality enforcer": { id: 75, description: "Time machines x2.", price: 70000000000000000, building: "Time machine", requiredCount: 50, multiplier: 2, bought: false },
  "Golden verse": { id: 76, description: "Time machines x2.", price: 7000000000000000000, building: "Time machine", requiredCount: 100, multiplier: 2, bought: false },
  "Eternal cycle": { id: 77, description: "Time machines x2.", price: 700000000000000000000, building: "Time machine", requiredCount: 150, multiplier: 2, bought: false },
  "Recursive causality": { id: 78, description: "Time machines x2.", price: 70000000000000000000000, building: "Time machine", requiredCount: 200, multiplier: 2, bought: false },

  // Golden Cookies upgrades
  "Golden Cookies": { id: 79, description: "Randomly spawns a Golden Cookie", price: 100000, building: "GC", requiredCount: 1, multiplier: 1, bought: false },
  "Lucky Day": { id: 80, description: "GC appears twice as often and stay twice as long", price: 10000000, building: "GC", requiredCount: 1, multiplier: 1, bought: false, requires: 79 },
  "Serendipity": { id: 81, description: "GC appears twice as often and stay twice as long", price: 1000000000, building: "GC", requiredCount: 1, multiplier: 1, bought: false, requires: 80 },
  "Get Lucky": { id: 82, description: "GC appears twice as often", price: 100000000000, building: "GC", requiredCount: 1, multiplier: 1, bought: false, requires: 81 },
};

/* ---------------------------------------------------------------- */
/* Building helpers                                                 */
/* ---------------------------------------------------------------- */

function getBuilding(name) {
  return buildings[name];
}

function getBuildingCount(name) {
  return getBuilding(name)?.count || 0;
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
    resetCount,
    pledge,
    buildings: buildingData,
    upgrades: Object.keys(upgrades).filter(name => upgrades[name].bought),
    achievements: Object.keys(achievements)
      .filter(name => achievements[name].unlocked),
    goldenCookieClickFrenzyTimer: goldenCookieClickFrenzyTimer,
    goldenCookieFrenzyTimer: goldenCookieFrenzyTimer,
    elderPledgeCount: elderPledge.count,
    cookiesBakedAllTime,
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
    resetCount,
    pledge: 0,
    cookiesBakedAllTime,
    buildings: {},
    upgrades: [],
    achievements: Object.keys(achievements)
      .filter(name => achievements[name].unlocked),
    elderPledgeCount: 0,
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
  resetCount = Number.isFinite(data.resetCount) ? data.resetCount : 0;
  pledge = Number.isFinite(data.pledge) ? data.pledge : 0;
  cookiesBakedAllTime = Number.isFinite(data.cookiesBakedAllTime) ? data.cookiesBakedAllTime : 0;

  goldenCookieClickFrenzyTimer = Number.isFinite(data.goldenCookieClickFrenzyTimer)
    ? Math.max(0, data.goldenCookieClickFrenzyTimer)
    : 0;

  goldenCookieFrenzyTimer = Number.isFinite(data.goldenCookieFrenzyTimer)
    ? Math.max(0, data.goldenCookieFrenzyTimer)
    : 0;

  goldenCookieClickMultiplier =
    goldenCookieClickFrenzyTimer > 0 ? 777 : 1;

  goldenCookieCpsMultiplier =
    goldenCookieFrenzyTimer > 0 ? 7 : 1;

  elderPledge.count = Number.isFinite(data.elderPledgeCount)
    ? Math.max(0, data.elderPledgeCount)
    : 0;
  elderPledge.currentPrice = Math.ceil(elderPledge.basePrice * Math.pow(1.1, elderPledge.count));

  Object.keys(buildings).forEach(name => {
    const saved = data.buildings?.[name];
    const building = buildings[name];

    building.count = Math.max(0, Number.parseInt(saved?.count ?? 0, 10));

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

  Object.keys(achievements).forEach(name => {
    achievements[name].unlocked = false;
  });

  Object.keys(multipliers).forEach(name => {
    multipliers[name] = 1;
  });

  (data.upgrades || []).forEach(name => {
    const upgrade = upgrades[name];
    if (!upgrade) return;

    upgrade.bought = true;
    if (upgrade.building !== "GC") {
      multipliers[upgrade.building] *= upgrade.multiplier;
    }

  });

  (data.achievements || []).forEach(name => {
    if (achievements[name]) {
      achievements[name].unlocked = true;
    }
  });

  updateGoldenCookieModifiers();
  scheduleGoldenCookie();

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
    return false;
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

function saveGame() {
  saveGameToLocalStorage();
  saveTimer = SAVE_INTERVAL_SECONDS;
  new Pop("credits", "Saved");
}

function loadGame() {
  const loadedFromLocalStorage = loadGameFromLocalStorage();

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
    new Pop("credits", "Imported.");
  } else {
    new Pop("credits", "Invalid save.");
  }
}

function resetGame() {
  if (!confirm("Do you REALLY want to start over?")) return;

  prestige += calculatePrestige();
  resetCount++;
  localStorage.setItem(SAVE_KEY, resetSaveString());

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

function getCursorClickGain() {
  return getCursorGain()
    * (prestige + 1)
    * goldenCookieClickMultiplier;
}

function getCursorAutoClickGain() {
  return getCursorGain()
    * (prestige + 1)
    * goldenCookieCpsMultiplier;
}

function clickCookie() {
  const amount = getCursorClickGain();

  cookies += amount;
  cookiesBakedAllTime += amount;

  if (pops.length < 260 && numbersOn) {
    new Pop("cookie", "+" + amount);
  }
}

function produceCursorCookies() {
  const count = buildings.Cursor.count;
  if (!count) return;

  const interval = Math.max(1, Math.ceil(150 / count));

  if (ticks % interval === 0) {
    addCookies(getCursorAutoClickGain(), "cookie");
  }
}


function getCursorCps() {
  const count = buildings.Cursor.count;

  if (!count) return 0;

  const interval = Math.max(1, Math.ceil(150 / count));
  const clicksPerSecond = TICKS_PER_SECOND / interval;

  return getCursorAutoClickGain() * clicksPerSecond;
}

function getCookiesPerSecond() {
  let cps = getCursorCps();

  Object.keys(buildings).forEach(name => {
    if (name === "Cursor") return;

    const count = buildings[name].count;
    cps += count * getBuildingGain(name) / 5;
  });

  return cps;
}

function addCookies(amount, elementId) {
  amount *= prestige + 1;
  cookies += amount;
  cookiesBakedAllTime += amount;

  if (elementId && pops.length < 250 && numbersOn) {
    new Pop(elementId, "+" + amount);
  }
}

/* ---------------------------------------------------------------- */
/* Building rendering                                               */
/* ---------------------------------------------------------------- */

function refreshBuildingVisuals(name, elementId, className, side, spacingX = 24, spacingY = 24) {
  const count = buildings[name].count;
  let output = "";

  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * 20 + (i % 10) * spacingX);
    const y = Math.floor(
      Math.random() * 20 + Math.floor(i / 10) * spacingY
    );

    output += `
      <div class="${className}"
        style="${side}:${x}px;top:${y}px;">
      </div>
    `;
  }

  getElement(elementId).innerHTML = output;
}


function refreshGrandmas() {
  const count = buildings.Grandma.count;
  let output = "";

  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * 20 + (i % 10) * 24);
    const y = Math.floor(Math.random() * 20 + Math.floor(i / 10) * 24);
    let className = "";

    if (buildings["Alchemy lab"].count && Math.random() < 0.2) className = "goldengrandma";
    if (buildings["Factory"].count && Math.random() < 0.2) className = "factorygrandma";
    if (buildings["Mine"].count && Math.random() < 0.2) className = "minegrandma";
    if (buildings["Shipment"].count && Math.random() < 0.2) className = "shipmentgrandma";
    if (buildings["Portal"].count && pledge <= 0 && Math.random() < 0.2) className = "portalgrandma";
    if (buildings["Time machine"].count && Math.random() < 0.2) className = "timegrandma";
    if (buildings["Farm"].count && Math.random() < 0.2) className = "farmgrandma";
    if (buildings["Bank"].count && Math.random() < 0.2) className = "bankgrandma";
    if (buildings["Temple"].count && Math.random() < 0.2) className = "templegrandma";
    if (buildings["Wizard tower"].count && Math.random() < 0.2) className = "wizardtowergrandma";
    if (pledge && Math.random() < 0.2) className = "pledgedgrandma";

    output += `
      <div class="${className ? className + " " : ""}grandma"
        style="left:${x}px;top:${y}px;">
      </div>
    `;
  }

  getElement("grandmas").innerHTML = output;
}


function refreshAllBuildingVisuals() {
  refreshGrandmas();

  const buildingsToRefresh = [
    ["Mine", "mines", "mine", "left", 16, 16],
    ["Factory", "factories", "factory", "right", 32, 24],
    ["Shipment", "shipments", "shipment", "right", 24, 24],
    ["Alchemy lab", "labs", "lab", "right", 24, 16],
    ["Portal", "portals", "portal", "right", 24, 24],
    ["Time machine", "times", "time", "right", 24, 24],
    ["Farm", "farms", "farm", "left", 24, 24],
    ["Bank", "banks", "bank", "right", 24, 24],
    ["Temple", "temples", "temple", "right", 24, 24],
    ["Wizard tower", "towers", "tower", "right", 24, 24]
  ];

  buildingsToRefresh.forEach(config => {
    refreshBuildingVisuals(...config);
  });
}


function buyBuilding(name) {
  const building = getBuilding(name);
  if (!building || !loaded || cookies < building.currentPrice) return;

  cookies -= building.currentPrice;
  building.count++;

  updateBuildingPrice(name);
  rebuildStore();
  refreshAllBuildingVisuals();

  upgradesToRebuild = true;
}

/* ---------------------------------------------------------------- */
/* GC                                                             */
/* ---------------------------------------------------------------- */
function spawnGoldenCookie() {
    // Sécurité : pas deux GC à la fois
    if (goldenCookieVisible) return;

    goldenCookieVisible = true;

    const cookie = document.createElement("img");

    cookie.id = "goldenCookie";
    cookie.src = "goldencookie.png";
    cookie.alt = "Golden Cookie";

    cookie.style.position = "fixed";
    cookie.style.width = "128px";
    cookie.style.height = "128px";
    cookie.style.cursor = "pointer";
    cookie.style.zIndex = "100001";

    const maxX = Math.max(0, window.innerWidth - 128);
    const maxY = Math.max(0, window.innerHeight - 128);

    cookie.style.left = `${Math.random() * maxX}px`;
    cookie.style.top = `${Math.random() * maxY}px`;

    cookie.addEventListener("click", () => {
        clickGoldenCookie(cookie);
    });

    document.body.appendChild(cookie);

    setTimeout(() => {
        cookie.style.opacity = "1";
    }, 0);

    // Makes GC disappearing
    goldenCookieTimeout = setTimeout(() => {
        removeGoldenCookie(cookie);
    }, 13 * 1000 * goldenCookieDurationMultiplier);
}

function clickGoldenCookie(cookie) {
    if (goldenCookieTimeout) {
        clearTimeout(goldenCookieTimeout);
        goldenCookieTimeout = null;
    }

    if (cookie.parentNode) {
        cookie.parentNode.removeChild(cookie);
    }

    goldenCookieVisible = false;

    const roll = Math.random();

    if (roll < 0.40) {
        goldenCookieLucky();
    } else if (roll < 0.80) {
        goldenCookieFrenzy();
    } else if (roll < 0.837) {
        goldenCookieClickFrenzy();
    } else {
        goldenCookieClot();
    }

    scheduleGoldenCookie();
}

function removeGoldenCookie(cookie) {
    if (!cookie || !cookie.parentNode) {
        goldenCookieVisible = false;
        scheduleGoldenCookie();
        return;
    }

    cookie.classList.add("fadingOut");

    setTimeout(() => {
        if (cookie.parentNode) {
            cookie.parentNode.removeChild(cookie);
        }

        goldenCookieVisible = false;
        goldenCookieTimeout = null;

        scheduleGoldenCookie();
    }, 3000);
}

function randomGoldenCookieDelay() {
    const minDelay = 5 * 60 * 1000;
    const maxDelay = 15 * 60 * 1000;

    const delay = (
        minDelay + Math.random() * (maxDelay - minDelay)
    ) / goldenCookieSpawnMultiplier;

    return delay;
}

function scheduleGoldenCookie() {
    // Le système n'est actif que si l'upgrade est achetée
    if (!upgrades["Golden Cookies"]?.bought) return;

    // Ne jamais programmer un nouveau GC s'il y en a déjà un
    if (goldenCookieVisible || goldenCookieTimer) return;

    const delay = randomGoldenCookieDelay();

    goldenCookieTimer = setTimeout(() => {
        goldenCookieTimer = null;
        spawnGoldenCookie();
    }, delay);
}

function updateGoldenCookieModifiers() {
    goldenCookieSpawnMultiplier = 1;
    goldenCookieDurationMultiplier = 1;

    if (upgrades["Lucky Day"]?.bought) {
        goldenCookieSpawnMultiplier *= 2;
        goldenCookieDurationMultiplier *= 2;
    }

    if (upgrades["Serendipity"]?.bought) {
        goldenCookieSpawnMultiplier *= 2;
        goldenCookieDurationMultiplier *= 2;
    }

    if (upgrades["Get Lucky"]?.bought) {
        goldenCookieSpawnMultiplier *= 2;
    }
}

function goldenCookieLucky() {
    const bankedCookies = cookies * 0.15 + 13;
    const fifteenMinutes = getCookiesPerSecond() * 900 + 13;

    const reward = Math.min(bankedCookies, fifteenMinutes);

    cookies += reward;
    cookiesBakedAllTime += reward;

    new Pop("credits", `Lucky! +${Math.floor(reward)} cookies`);
}

function goldenCookieFrenzy() {
    goldenCookieCpsMultiplier = 7;
    goldenCookieFrenzyTimer = 77 * TICKS_PER_SECOND;
    new Pop("credits", "Frenzy!");
}

function goldenCookieClickFrenzy() {
    goldenCookieClickMultiplier = 777;
    goldenCookieClickFrenzyTimer = 13 * TICKS_PER_SECOND;
    new Pop("credits", "Click Frenzy!");
}

function goldenCookieClot() {
    new Pop("credits", "Clot");
}

function createBuffDisplay() {
  if (getElement("buffs")) return;

  const saveMenu = getElement("saveMenu");
  if (!saveMenu) return;

  const buffs = document.createElement("div");
  buffs.id = "buffs";

  saveMenu.insertAdjacentElement("afterend", buffs);
}

function updateBuffDisplay() {
  const container = getElement("buffs");
  if (!container) return;

  const activeBuffs = getActiveBuffs();

  const activeIds = activeBuffs.map(buff => buff.id).join(",");

  if (container.dataset.active !== activeIds) {
    container.innerHTML = activeBuffs.map(buff => `
      <div class="activeBuff" data-buff="${buff.id}">
        <img src="${buff.icon}">
        <div class="buffTimer"></div>
        <span class="buffTooltip">
          <b>${buff.name}</b><br>
          ${buff.description}
        </span>
      </div>
    `).join("");

    container.dataset.active = activeIds;
  }

  activeBuffs.forEach(buff => {
    const element = container.querySelector(
      `[data-buff="${buff.id}"]`
    );

    if (!element) return;

    const seconds = Math.ceil(buff.timer / TICKS_PER_SECOND);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    const timerText =
      minutes > 0
        ? `${minutes}:${String(remainingSeconds).padStart(2, "0")}`
        : `${remainingSeconds}s`;

    element.querySelector(".buffTimer").textContent = timerText;
  });
}

function updateFrenzyHalo() {
  const comment = getElement("comment");
  if (!comment) return;

  const frenzyActive =
    goldenCookieFrenzyTimer > 0 ||
    goldenCookieClickFrenzyTimer > 0;

  comment.classList.toggle("goldenFrenzy", frenzyActive);
}

function getActiveBuffs() {
  const buffs = [];

  if (goldenCookieFrenzyTimer > 0) {
    buffs.push({
      id: "frenzy",
      name: "Frenzy",
      icon: "frenzyicon.png",
      description: "Cookie production x7.",
      timer: goldenCookieFrenzyTimer
    });
  }

  if (goldenCookieClickFrenzyTimer > 0) {
    buffs.push({
      id: "clickFrenzy",
      name: "Click Frenzy",
      icon: "clickfrenzyicon.png",
      description: "Cookie clicking x777.",
      timer: goldenCookieClickFrenzyTimer
    });
  }

  return buffs;
}

/* ---------------------------------------------------------------- */
/* Store                                                             */
/* ---------------------------------------------------------------- */

function rebuildStore() {
  let output = "";

  Object.keys(buildings).forEach(name => {
    const building = buildings[name];

    output += `
      <div id="buy${name}" data-buy="${name}" style="background-image:url(${building.icon}.png);">
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


  getElement("store").innerHTML = output;

  getElement("store").querySelectorAll("[data-buy]").forEach(element => {
    element.addEventListener("click", () => buyBuilding(element.dataset.buy));
  });

  storeToRebuild = false;
}

/* ---------------------------------------------------------------- */
/* Elder Pledge                                                     */
/* ---------------------------------------------------------------- */

function buyElderPledge() {
  if (!loaded || pledge > 0 || cookies < elderPledge.currentPrice) return;

  cookies -= elderPledge.currentPrice;
  elderPledge.count++;
  elderPledge.currentPrice = Math.ceil(elderPledge.basePrice * Math.pow(1.1, elderPledge.count));

  pledge += 30 * 60 * 10;

  refreshGrandmas();
  upgradesToRebuild = true;
}

/* ---------------------------------------------------------------- */
/* Upgrades                                                         */
/* ---------------------------------------------------------------- */
function isUpgradeAvailable(upgrade) {
  if (upgrade.bought) return false;

  if (upgrade.requires !== undefined) {
    const requiredUpgrade = Object.values(upgrades).find(
      u => u.id === upgrade.requires
    );

    if (!requiredUpgrade || !requiredUpgrade.bought) {
      return false;
    }
  }

  if (
    upgrade.building !== "GC" &&
    upgrade.requiredCount !== undefined
  ) {
    const building = buildings[upgrade.building];

    if (!building || building.count < upgrade.requiredCount) {
      return false;
    }
  }

  return true;
}

function buyUpgrade(name) {
  const upgrade = upgrades[name];

  if (!upgrade || !isUpgradeAvailable(upgrade) || upgrade.bought || !loaded || cookies < upgrade.price) return;

  cookies -= upgrade.price;
  upgrade.bought = true;

  if (upgrade.building !== "GC") {
    multipliers[upgrade.building] *= upgrade.multiplier;
  }

  if (name === "Golden Cookies") {
    scheduleGoldenCookie();
  }

  upgradesToRebuild = true;
  updateGoldenCookieModifiers();

  new Pop("store_upgrades", name + " bought!");

}

function rebuildUpgradesStore() {
  let output = "";
  let visibleCount = 0;
  const smallFont = "font-size:80%;";

  Object.entries(upgrades)
    .sort(([, a], [, b]) => a.requiredCount - b.requiredCount)
    .forEach(([name, upgrade]) => {

      // Upgrade filtering
      if (upgrade.building === "GC") {
        upgrade.icon = upgrade.building + "icon.png";
      } else {
        upgrade.icon =
          upgrade.building.replace(/\s/g, "").toLowerCase() + "icon.png";
      }

      if (!isUpgradeAvailable(upgrade)) return;

      const classes = visibleCount < MAX_VISIBLE_UPGRADES ? "" : "hidden";
      visibleCount++;

      output += `
        <div id="upgrade${name}" data-upgrade="${name}" class="${classes}" style="${smallFont}background-image:url(${upgrade.icon});">
          <div class="tooltipStore">
            <div class="building-icon"></div>
            <b>${name}</b>
            <moni></moni> ${beautify(upgrade.price)}
            <span class="tooltipTextStore">${upgrade.description}</span>
          </div>
        </div>
      `;
    });

  output += `
    <div id="buyElderPledge" style="${smallFont}background-image:url(pledgeicon.png);">
      <div class="tooltipStore">
        <div class="building-icon"></div>
        <b>Elder Pledge</b>
        <moni></moni> ${beautify(elderPledge.currentPrice)}
        <span class="tooltipTextStore">Puts an end to the Ancients' wrath, at least for a while.</span>
      </div>
    </div>
  `;

  getElement("store_upgrades").innerHTML = output;

  getElement("store_upgrades").querySelectorAll("[data-upgrade]").forEach(element => {
    element.addEventListener("click", () => buyUpgrade(element.dataset.upgrade));
  });

  getElement("buyElderPledge").addEventListener("click", buyElderPledge);

  upgradesToRebuild = false;
}


/* ---------------------------------------------------------------- */
/* Achievements                                                     */
/* ---------------------------------------------------------------- */

function getAchievementProgress(achievement) {
  const type = achievementTypes[achievement.type];

  if (!type) return 0;

  return type.getProgress(achievement);
}

function unlockAchievement(name) {
  const achievement = achievements[name];

  if (!achievement || achievement.unlocked) return;

  achievement.unlocked = true;

  new Pop(
    "credits",
    "Achievement unlocked: " + name
  );
}

function checkAchievements() {
  Object.keys(achievements).forEach(name => {
    const achievement = achievements[name];

    if (achievement.unlocked) return;

    const progress = getAchievementProgress(achievement);

    if (progress >= achievement.requirement) {
      unlockAchievement(name);
    }
  });
}

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

function getBuildingGain(name) {
  return buildings[name].gain * multipliers[name] * goldenCookieCpsMultiplier;
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


function updateStoreAffordability() {
  Object.keys(buildings).forEach(name => {
    const element = getElement("buy" + name);
    if (!element) return;

    element.classList.toggle(
      "grayed",
      cookies < buildings[name].currentPrice
    );
  });
}

function updateUpgradeAffordability() {
  Object.keys(upgrades).forEach(name => {
    const upgrade = upgrades[name];
    const element = getElement("upgrade" + name);

    if (!element || upgrade.bought || element.classList.contains("hidden")) return;

    element.classList.toggle("grayed", cookies < upgrade.price);
  });

  const pledgeElement = getElement("buyElderPledge");
  if (pledgeElement) {
    pledgeElement.classList.toggle("grayed", pledge > 0 || cookies < elderPledge.currentPrice);
  }
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
  produceBuildingCookies("Wizard tower", "towers");
  produceBuildingCookies("Temple", "temples");
  produceBuildingCookies("Bank", "banks");
  produceBuildingCookies("Factory", "factories");
  produceBuildingCookies("Mine", "mines");
  produceBuildingCookies("Farm", "farms");
  produceBuildingCookies("Grandma", "grandmas");
  produceCursorCookies();


  /* GC Timers */
  if (goldenCookieFrenzyTimer > 0) {
      goldenCookieFrenzyTimer--;

      if (goldenCookieFrenzyTimer <= 0) {
          goldenCookieFrenzyTimer = 0;
          goldenCookieCpsMultiplier = 1;
      }
  }
  if (goldenCookieClickFrenzyTimer > 0) {
      goldenCookieClickFrenzyTimer--;

      if (goldenCookieClickFrenzyTimer <= 0) {
          goldenCookieClickFrenzyTimer = 0;
          goldenCookieClickMultiplier = 1;
      }
  }

  updateFrenzyHalo();
  updateBuffDisplay();

  const cps = getCookiesPerSecond();
  checkAchievements();

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
  getElement("resetCounterDisplay").innerHTML = resetCount;

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
    [5, "Your first batch goes in the trash.<br>The neighborhood raccoon barely touches it."],
    [50, "Your family accepts to try some of your cookies."],
    [100, "Your cookies are popular in the neighborhood."],
    [500, "People are starting to talk about your cookies."],
    [1000, "Your cookies are talked about for miles around."],
    [5000, "Your cookies are renowned in the whole town!"],
    [10000, "Your cookies bring all the boys to the yard."],
    [50000, "Your cookies now have their own website!"],
    [100000, "Your cookies are worth a lot of money."],
    [500000, "Your cookies sell very well in distant countries."],
    [1000000, "People come from very far away to get a taste of your cookies."],
    [5000000, "Kings and queens from all over the world are enjoying your cookies."],
    [10000000, "There are now museums dedicated to your cookies."],
    [50000000, "A national day has been created in honor of your cookies."],
    [100000000, "Your cookies have been named a part of the world wonders."],
    [500000000, "History books now include a whole chapter about your cookies."],
    [1000000000, "Your cookies have been placed under government surveillance."],
    [5000000000, "The whole planet is enjoying your cookies!"],
    [10000000000, "Strange creatures from neighboring planets wish to try your cookies."],
    [250000, "Elder gods from the whole cosmos have awoken to taste your cookies."],
    [100000000000, "Beings from other dimensions lapse into existence just to get a taste of your cookies."],
    [500000000000, "Your cookies have achieved sentience."],
    [1000000000000, "The universe has now turned into cookie dough, to the molecular level."],
    [5000000000000, "Your cookies are rewriting the fundamental laws of the universe."],
    [10000000000000, "It's time to stop playing."],
    [100000000000000, "A local news station runs a 10-minute segment about your cookies. Success!<br><span style=\"font-size:50%;\">(you win a cookie)</span>"]
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

function initOverlay() {
  const backdrop = getElement("overlayBackdrop");

  getElement("openOverlayBtn").addEventListener("click", () => {
    backdrop.classList.add("visible");
    renderOverlayUpgrades();
  });

  getElement("overlayClose").addEventListener("click", () => {
    backdrop.classList.remove("visible");
  });

  getElement("overlayAllTimeCookies").innerHTML = "Cookies baked (all time): " + beautify(cookiesBakedAllTime);

  backdrop.addEventListener("click", event => {
    if (event.target === backdrop) backdrop.classList.remove("visible");
  });

  document.querySelectorAll(".overlayTab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".overlayTab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".overlayPane").forEach(p => p.classList.remove("active"));

      tab.classList.add("active");
      document.querySelector(`.overlayPane[data-pane="${tab.dataset.tab}"]`).classList.add("active");

      if (tab.dataset.tab === "upgrades") renderOverlayUpgrades();
      if (tab.dataset.tab === "achievements") renderOverlayAchievements();
    });
  });

  renderChangelog();
}

function renderChangelog() {
  const entries = [
    { version: "0.131a", date: "15/09/2026", notes: ["adding icons, minor bug fixes"] },
    { version: "0.130", notes: ["adding Golden Cookies"] },
    { version: "0.129", notes: ["adding achievements"] },
    { version: "0.128", notes: ["refactored naming and comments", "refactored building state", "cleaned up save handling"] },
    { version: "0.127", notes: ["standalone, cleaned-up build"] },
    { version: "0.126", notes: ["technical fixes", "better servers!"] },
    { version: "0.125", notes: ["added a new object", "added option to disable flashing"] },
    { version: "0.124", notes: ["elder pledge is cheaper and now buffs grandmas and clicking while active", "page title now displays cookies"] },
    { version: "0.123", notes: ["added cookies per second", "reworked grandmas"] }
  ];

  getElement("overlayChangelog").innerHTML = entries.map(entry => `
    <div class="version-block">
      <b>${entry.version}${entry.date ? " — " + entry.date : ""}</b>
      <ul>${entry.notes.map(n => `<li>${n}</li>`).join("")}</ul>
    </div>
  `).join("");
}

function renderOverlayUpgrades() {
  getElement("overlayUpgradesList").innerHTML = Object.entries(upgrades).map(([name, upgrade]) => {
    const unlocked = isUpgradeAvailable(upgrade) || upgrade.bought;
    const status = upgrade.bought ? "bought" : unlocked ? "" : "locked";
    const label = upgrade.bought ? "Bought" : unlocked ? beautify(upgrade.price) : "Locked";

    return `
      <div class="overlayUpgradeRow ${status}">
        <span>${name}</span>
        <span>${label}</span>
        <span class="tooltipTextStore">${upgrade.description}</span>
      </div>
    `;
  }).join("");
}
function renderOverlayAchievements() {
  getElement("overlayAchievementsList").innerHTML = Object.entries(achievements).map(([name, achievement]) => {
    const progress = getAchievementProgress(achievement);
    const status = achievement.unlocked ? "bought" : "locked";
    const label = achievement.unlocked
      ? "Unlocked"
      : `${beautify(Math.floor(progress))} / ${beautify(achievement.requirement)}`;

    return `
      <div class="overlayUpgradeRow ${status}">
        <span>${name}</span>
        <span>${label}</span>
        <span class="tooltipTextStore">${achievement.description}</span>
      </div>
    `;
  }).join("");
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
  getElement("save").addEventListener("click", saveGame);
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

  initOverlay();
  createBuffDisplay();
  loadGame();
}

window.addEventListener("load", initialize);
