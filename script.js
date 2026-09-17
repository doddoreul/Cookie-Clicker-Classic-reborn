"use strict";

/* ---------------------------------------------------------------- */
/* Constants                                                        */
/* ---------------------------------------------------------------- */

const VERSION = "0.134";
const SAVE_KEY = "CookieClickerClassic_Reborn_Save";
const SETTINGS_KEY = "CookieClickerClassic_Reborn_Settings";
const SAVE_FORMAT_VERSION = 2;
const TICKS_PER_SECOND = 30;
const SAVE_INTERVAL_SECONDS = 30 * 60;
const MAX_VISIBLE_UPGRADES = 5;
const MAX_OFFLINE_SECONDS = 24 * 60 * 60;

/* ---------------------------------------------------------------- */
/* DOM and formatting helpers                                        */
/* ---------------------------------------------------------------- */

function getElement(id) {
  return document.getElementById(id);
}

const lastRenderedText = {};

function setElementText(id, text) {
  if (lastRenderedText[id] === text) return;

  lastRenderedText[id] = text;
  const element = getElement(id);
  if (element) element.innerHTML = text;
}

const NUMBER_SUFFIXES = [
  [1e6, "M"],        // million
  [1e9, "B"],        // billion
  [1e12, "T"],       // trillion
  [1e15, "Qa"],      // quadrillion
  [1e18, "Qi"],      // quintillion
  [1e21, "Sx"],      // sextillion
  [1e24, "Sp"],      // septillion
  [1e27, "Oc"],      // octillion
  [1e30, "No"],      // nonillion
  [1e33, "Dc"],      // decillion
  [1e36, "UDc"],     // undecillion
  [1e39, "DDc"],     // duodecillion
  [1e42, "TDc"],     // tredecillion
  [1e45, "QaDc"],    // quattuordecillion
  [1e48, "QiDc"],    // quindecillion
  [1e51, "SxDc"],    // sexdecillion
  [1e54, "SpDc"],    // septendecillion
  [1e57, "OcDc"],    // octodecillion
  [1e60, "NoDc"],    // novemdecillion
  [1e63, "Vg"],      // vigintillion
  [1e66, "UVg"],     // unvigintillion
  [1e69, "DVg"],     // duovigintillion
  [1e72, "TVg"],     // tresvigintillion
  [1e75, "QaVg"],    // quattuorvigintillion
  [1e78, "QiVg"],    // quinvigintillion
  [1e81, "SxVg"],    // sesvigintillion
  [1e84, "SpVg"],    // septenvigintillion
  [1e87, "OcVg"],    // octovigintillion
  [1e90, "NoVg"],    // novemvigintillion
  [1e93, "VgVg"],    // trigintillion
  [1e96, "UVgVg"],   // untrigintillion
  [1e99, "DVgVg"],   // duotrigintillion
  [1e102, "TVgVg"],  // tretrigintillion
  [1e105, "QaVgVg"], // quattuortrigintillion
  [1e108, "QiVgVg"], // quintrigintillion
  [1e111, "SxVgVg"], // sextrigintillion
  [1e114, "SpVgVg"], // septentrigintillion
  [1e117, "OcVgVg"], // octotrigintillion
  [1e120, "NoVgVg"], // novemtrigintillion
  [1e123, "VgVgVg"]  // centillion
];

function beautifyShort(value) {
  for (let i = NUMBER_SUFFIXES.length - 1; i >= 0; i--) {
    const [power, suffix] = NUMBER_SUFFIXES[i];

    if (value >= power) {
      const scaled = value / power;

      let decimals;
      if (scaled < 10) decimals = 3;
      else if (scaled < 100) decimals = 2;
      else if (scaled < 1000) decimals = 1;
      else decimals = 0;

      return String(parseFloat(scaled.toFixed(decimals))) + suffix;
    }
  }

  return null;
}

function beautify(value) {
  const short = beautifyShort(value);
  if (short !== null) return short;

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

const defaultSettings = {
  numbersOn: true,
  flashing: true,
  bakeryName: ""
};
const settings = { ...defaultSettings };

const elderPledge = {
  basePrice: 6666666,
  currentPrice: 6666666,
  count: 0
};

let loaded = false;
let storeToRebuild = true;
let upgradesToRebuild = true;
let storeBuyElements = {};
let storeBulkElements = {};
let upgradeRowElements = {};
let cookies = 0;
let cookiesBakedAllTime = 0;
let cookiesDisplay = 0;
let ticks = 0;
let prestige = 0;
let pledge = 0;
let saveTimer = SAVE_INTERVAL_SECONDS;
let resetCount = 0;
let globalMultiplier = 1;

/* Gain cache (synergy multipliers and cookies per second) */
let gainCacheDirty = true;
let cachedSynergy = {};
let cachedCps = null;

function invalidateGainCache() {
  gainCacheDirty = true;
}

function ensureGainCache() {
  if (gainCacheDirty) {
    cachedSynergy = {};
    cachedCps = null;
    gainCacheDirty = false;
  }
}

/* Golden cookie state */
let goldenCookieVisible = false;
let goldenCookieTimer = null;
let goldenCookieTimeout = null;
let goldenCookieSpawnMultiplier = 1;
let goldenCookieDurationMultiplier = 1;
let goldenCookieCpsMultiplier = 1;
let goldenCookieFrenzyTimer = 0;
let goldenCookieClickMultiplier = 1;
let goldenCookieClickFrenzyTimer = 0;

/* Idle and offline catch-up state */
let lastTickTimestamp = performance.now ? performance.now() : Date.now();
let cameBackFromIdle = false;
let cookiesGainedWhileHidden = 0;

/* Floating number pops */
const pops = [];
const popAnchors = {};

/* ---------------------------------------------------------------- */
/* Buildings                                                        */
/* ---------------------------------------------------------------- */

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
    basePrice: 4000,
    gain: 125,
    description: "Mines out cookie dough and chocolate chips.",
    icon: "mineicon"
  },
  Factory: {
    id: 4,
    count: 0,
    basePrice: 32000,
    gain: 900,
    description: "Produces large quantities of cookies.",
    icon: "factoryicon"
  },
  Bank: {
    id: 5,
    count: 0,
    basePrice: 280000,
    gain: 7000,
    description: "Generates cookies from interest.",
    icon: "bankicon"
  },
  Temple: {
    id: 6,
    count: 0,
    basePrice: 1900000,
    gain: 43000,
    description: "Full of precious, ancient chocolate.",
    icon: "templeicon"
  },
  "Wizard tower": {
    id: 7,
    count: 0,
    basePrice: 15000000,
    gain: 325000,
    description: "Summons cookies with magic spells.",
    icon: "wizardtowericon"
  },
  Shipment: {
    id: 8,
    count: 0,
    basePrice: 130000000,
    gain: 2400000,
    description: "Brings in fresh cookies from the cookie planet.",
    icon: "shipmenticon"
  },
  "Alchemy lab": {
    id: 9,
    count: 0,
    basePrice: 1300000000,
    gain: 25000000,
    description: "Turns gold into cookies!",
    icon: "labicon"
  },
  Portal: {
    id: 10,
    count: 0,
    basePrice: 9000000000,
    gain: 150000000,
    description: "Opens a door to the Cookieverse.",
    icon: "portalicon"
  },
  "Time machine": {
    id: 11,
    count: 0,
    basePrice: 70000000000,
    gain: 750000000,
    description: '<span style="font-size:80%;">Brings cookies from the past, before they were even eaten.</span>',
    icon: "timemachineicon"
  }
};

const multipliers = {};
Object.keys(buildings).forEach(name => multipliers[name] = 1);

/* ---------------------------------------------------------------- */
/* Achievement types                                                */
/* ---------------------------------------------------------------- */

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
      return resetCount;
    }
  }
};

/* ---------------------------------------------------------------- */
/* Achievements                                                     */
/* ---------------------------------------------------------------- */

const achievements = {
  "Casual baking": { id: 0, type: "cps", requirement: 1, description: "Bake 1 cookie per second.", unlocked: false },
  "Hardcore baking": { id: 1, type: "cps", requirement: 10, description: "Bake 10 cookies per second.", unlocked: false },
  "Steady tasty stream": { id: 2, type: "cps", requirement: 100, description: "Bake 100 cookies per second.", unlocked: false },
  "Cookie monster": { id: 3, type: "cps", requirement: 1000, description: "Bake 1,000 cookies per second.", unlocked: false },
  "Mass producer": { id: 4, type: "cps", requirement: 10000, description: "Bake 10,000 cookies per second.", unlocked: false },
  "Cookie vortex": { id: 5, type: "cps", requirement: 1000000, description: "Bake 1 million cookies per second.", unlocked: false },
  "Cookie pulsar": { id: 72, type: "cps", requirement: 10000000, description: "Bake 10 million cookies per second.", unlocked: false },
  "Cookie quasar": { id: 73, type: "cps", requirement: 100000000, description: "Bake 100 million cookies per second.", unlocked: false },
  "Oh hey, you're still here": { id: 74, type: "cps", requirement: 1000000000, description: "Bake 1 billion cookies per second.", unlocked: false },
  "Let's never bake again": { id: 75, type: "cps", requirement: 10000000000, description: "Bake 10 billion cookies per second.", unlocked: false },

  "Wake and bake": { id: 76, type: "cookies", requirement: 1, description: "Bake 1 cookie in one reset.", unlocked: false },
  "Making some dough": { id: 77, type: "cookies", requirement: 1000, description: "Bake 1,000 cookies in one reset.", unlocked: false },
  "So baked right now": { id: 78, type: "cookies", requirement: 100000, description: "Bake 100,000 cookies in one reset.", unlocked: false },
  "Fledgling bakery": { id: 79, type: "cookies", requirement: 1000000, description: "Bake 1 million cookies in one reset.", unlocked: false },
  "Affluent bakery": { id: 80, type: "cookies", requirement: 100000000, description: "Bake 100 million cookies in one reset.", unlocked: false },
  "World-famous bakery": { id: 81, type: "cookies", requirement: 1000000000, description: "Bake 1 billion cookies in one reset.", unlocked: false },
  "Cosmic bakery": { id: 82, type: "cookies", requirement: 100000000000, description: "Bake 100 billion cookies in one reset.", unlocked: false },
  "Galactic bakery": { id: 83, type: "cookies", requirement: 1000000000000, description: "Bake 1 trillion cookies in one reset.", unlocked: false },
  "Universal bakery": { id: 84, type: "cookies", requirement: 100000000000000, description: "Bake 100 trillion cookies in one reset.", unlocked: false },

  "One finger": { id: 6, type: "buildings", target: "Cursor", requirement: 1, description: "Have 1 Cursor.", unlocked: false },
  "A handful of fingers": { id: 7, type: "buildings", target: "Cursor", requirement: 5, description: "Have 5 Cursors.", unlocked: false },
  "Ten fingers": { id: 8, type: "buildings", target: "Cursor", requirement: 10, description: "Have 10 Cursors.", unlocked: false },
  "Many fingers": { id: 9, type: "buildings", target: "Cursor", requirement: 20, description: "Have 20 Cursors.", unlocked: false },
  "Finger army": { id: 10, type: "buildings", target: "Cursor", requirement: 50, description: "Have 50 Cursors.", unlocked: false },
  "Of Mice and Men": { id: 85, type: "buildings", target: "Cursor", requirement: 100, description: "Have 100 Cursors.", unlocked: false },
  "The Digital": { id: 97, type: "buildings", target: "Cursor", requirement: 200, description: "Have 200 Cursors.", unlocked: false },
  "Extreme polydactyly": { id: 98, type: "buildings", target: "Cursor", requirement: 300, description: "Have 300 Cursors.", unlocked: false },

  "First grandma": { id: 11, type: "buildings", target: "Grandma", requirement: 1, description: "Have 1 Grandma.", unlocked: false },
  "Grandma's kitchen": { id: 12, type: "buildings", target: "Grandma", requirement: 5, description: "Have 5 Grandmas.", unlocked: false },
  "Grandma's house": { id: 13, type: "buildings", target: "Grandma", requirement: 10, description: "Have 10 Grandmas.", unlocked: false },
  "Grandma's village": { id: 14, type: "buildings", target: "Grandma", requirement: 20, description: "Have 20 Grandmas.", unlocked: false },
  "Grandma's empire": { id: 15, type: "buildings", target: "Grandma", requirement: 50, description: "Have 50 Grandmas.", unlocked: false },
  "Retirement home": { id: 86, type: "buildings", target: "Grandma", requirement: 100, description: "Have 100 Grandmas.", unlocked: false },
  "Ruler of the ancients": { id: 99, type: "buildings", target: "Grandma", requirement: 200, description: "Have 200 Grandmas.", unlocked: false },
  "The agemaster": { id: 100, type: "buildings", target: "Grandma", requirement: 300, description: "Have 300 Grandmas.", unlocked: false },

  "First harvest": { id: 16, type: "buildings", target: "Farm", requirement: 1, description: "Have 1 Farm.", unlocked: false },
  "Small farm": { id: 17, type: "buildings", target: "Farm", requirement: 5, description: "Have 5 Farms.", unlocked: false },
  "Growing farm": { id: 18, type: "buildings", target: "Farm", requirement: 10, description: "Have 10 Farms.", unlocked: false },
  "Big farm": { id: 19, type: "buildings", target: "Farm", requirement: 20, description: "Have 20 Farms.", unlocked: false },
  "Cookie plantation": { id: 20, type: "buildings", target: "Farm", requirement: 50, description: "Have 50 Farms.", unlocked: false },
  "Farm ill": { id: 87, type: "buildings", target: "Farm", requirement: 100, description: "Have 100 Farms.", unlocked: false },
  "Homegrown": { id: 101, type: "buildings", target: "Farm", requirement: 200, description: "Have 200 Farms.", unlocked: false },
  "Seedy business": { id: 102, type: "buildings", target: "Farm", requirement: 300, description: "Have 300 Farms.", unlocked: false },

  "First mine": { id: 21, type: "buildings", target: "Mine", requirement: 1, description: "Have 1 Mine.", unlocked: false },
  "Small operation": { id: 22, type: "buildings", target: "Mine", requirement: 5, description: "Have 5 Mines.", unlocked: false },
  "Ten mines": { id: 23, type: "buildings", target: "Mine", requirement: 10, description: "Have 10 Mines.", unlocked: false },
  "Deep mining": { id: 24, type: "buildings", target: "Mine", requirement: 20, description: "Have 20 Mines.", unlocked: false },
  "Cookie extraction": { id: 25, type: "buildings", target: "Mine", requirement: 50, description: "Have 50 Mines.", unlocked: false },
  "Hollow the planet": { id: 88, type: "buildings", target: "Mine", requirement: 100, description: "Have 100 Mines.", unlocked: false },
  "The center of the Earth": { id: 103, type: "buildings", target: "Mine", requirement: 200, description: "Have 200 Mines.", unlocked: false },
  "Freak fracking": { id: 104, type: "buildings", target: "Mine", requirement: 300, description: "Have 300 Mines.", unlocked: false },

  "First factory": { id: 26, type: "buildings", target: "Factory", requirement: 1, description: "Have 1 Factory.", unlocked: false },
  "Small industry": { id: 27, type: "buildings", target: "Factory", requirement: 5, description: "Have 5 Factories.", unlocked: false },
  "Mass production": { id: 28, type: "buildings", target: "Factory", requirement: 10, description: "Have 10 Factories.", unlocked: false },
  "Industrial complex": { id: 29, type: "buildings", target: "Factory", requirement: 20, description: "Have 20 Factories.", unlocked: false },
  "Cookie industry": { id: 30, type: "buildings", target: "Factory", requirement: 50, description: "Have 50 Factories.", unlocked: false },
  "Global warming": { id: 89, type: "buildings", target: "Factory", requirement: 100, description: "Have 100 Factories.", unlocked: false },
  "Technocracy": { id: 105, type: "buildings", target: "Factory", requirement: 200, description: "Have 200 Factories.", unlocked: false },
  "Modern times": { id: 106, type: "buildings", target: "Factory", requirement: 300, description: "Have 300 Factories.", unlocked: false },

  "First investment": { id: 31, type: "buildings", target: "Bank", requirement: 1, description: "Have 1 Bank.", unlocked: false },
  "Small savings": { id: 32, type: "buildings", target: "Bank", requirement: 5, description: "Have 5 Banks.", unlocked: false },
  "Growing fortune": { id: 33, type: "buildings", target: "Bank", requirement: 10, description: "Have 10 Banks.", unlocked: false },
  "Cookie finance": { id: 34, type: "buildings", target: "Bank", requirement: 20, description: "Have 20 Banks.", unlocked: false },
  "Cookie banking empire": { id: 35, type: "buildings", target: "Bank", requirement: 50, description: "Have 50 Banks.", unlocked: false },
  "A loan in the dark": { id: 90, type: "buildings", target: "Bank", requirement: 100, description: "Have 100 Banks.", unlocked: false },
  "It's the economy, stupid": { id: 107, type: "buildings", target: "Bank", requirement: 200, description: "Have 200 Banks.", unlocked: false },
  "The nerve of war": { id: 108, type: "buildings", target: "Bank", requirement: 300, description: "Have 300 Banks.", unlocked: false },

  "First temple": { id: 36, type: "buildings", target: "Temple", requirement: 1, description: "Have 1 Temple.", unlocked: false },
  "Sacred grounds": { id: 37, type: "buildings", target: "Temple", requirement: 5, description: "Have 5 Temples.", unlocked: false },
  "Holy order": { id: 38, type: "buildings", target: "Temple", requirement: 10, description: "Have 10 Temples.", unlocked: false },
  "Grand temple": { id: 39, type: "buildings", target: "Temple", requirement: 20, description: "Have 20 Temples.", unlocked: false },
  "Temple complex": { id: 40, type: "buildings", target: "Temple", requirement: 50, description: "Have 50 Temples.", unlocked: false },
  "New-age cult": { id: 91, type: "buildings", target: "Temple", requirement: 100, description: "Have 100 Temples.", unlocked: false },
  "Fanaticism": { id: 109, type: "buildings", target: "Temple", requirement: 200, description: "Have 200 Temples.", unlocked: false },
  "Wololo": { id: 110, type: "buildings", target: "Temple", requirement: 300, description: "Have 300 Temples.", unlocked: false },

  "First spell": { id: 41, type: "buildings", target: "Wizard tower", requirement: 1, description: "Have 1 Wizard Tower.", unlocked: false },
  "Apprentice wizard": { id: 42, type: "buildings", target: "Wizard tower", requirement: 5, description: "Have 5 Wizard Towers.", unlocked: false },
  "Arcane tower": { id: 43, type: "buildings", target: "Wizard tower", requirement: 10, description: "Have 10 Wizard Towers.", unlocked: false },
  "Magical complex": { id: 44, type: "buildings", target: "Wizard tower", requirement: 20, description: "Have 20 Wizard Towers.", unlocked: false },
  "Wizarding citadel": { id: 45, type: "buildings", target: "Wizard tower", requirement: 50, description: "Have 50 Wizard Towers.", unlocked: false },
  "Charms and enchantments": { id: 92, type: "buildings", target: "Wizard tower", requirement: 100, description: "Have 100 Wizard Towers.", unlocked: false },
  "Magic kingdom": { id: 111, type: "buildings", target: "Wizard tower", requirement: 200, description: "Have 200 Wizard Towers.", unlocked: false },
  "And now for my next trick, I'll need a volunteer from the audience": { id: 112, type: "buildings", target: "Wizard tower", requirement: 300, description: "Have 300 Wizard Towers.", unlocked: false },

  "First shipment": { id: 46, type: "buildings", target: "Shipment", requirement: 1, description: "Have 1 Shipment.", unlocked: false },
  "Small fleet": { id: 47, type: "buildings", target: "Shipment", requirement: 5, description: "Have 5 Shipments.", unlocked: false },
  "Shipping company": { id: 48, type: "buildings", target: "Shipment", requirement: 10, description: "Have 10 Shipments.", unlocked: false },
  "Trade network": { id: 49, type: "buildings", target: "Shipment", requirement: 20, description: "Have 20 Shipments.", unlocked: false },
  "Cookie trade empire": { id: 50, type: "buildings", target: "Shipment", requirement: 50, description: "Have 50 Shipments.", unlocked: false },
  "Far far away": { id: 93, type: "buildings", target: "Shipment", requirement: 100, description: "Have 100 Shipments.", unlocked: false },
  "We come in peace": { id: 113, type: "buildings", target: "Shipment", requirement: 200, description: "Have 200 Shipments.", unlocked: false },
  "It's not delivery": { id: 114, type: "buildings", target: "Shipment", requirement: 300, description: "Have 300 Shipments.", unlocked: false },

  "First experiment": { id: 51, type: "buildings", target: "Alchemy lab", requirement: 1, description: "Have 1 Alchemy Lab.", unlocked: false },
  "Amateur alchemist": { id: 52, type: "buildings", target: "Alchemy lab", requirement: 5, description: "Have 5 Alchemy Labs.", unlocked: false },
  "Alchemy workshop": { id: 53, type: "buildings", target: "Alchemy lab", requirement: 10, description: "Have 10 Alchemy Labs.", unlocked: false },
  "Master laboratory": { id: 54, type: "buildings", target: "Alchemy lab", requirement: 20, description: "Have 20 Alchemy Labs.", unlocked: false },
  "Alchemy empire": { id: 55, type: "buildings", target: "Alchemy lab", requirement: 50, description: "Have 50 Alchemy Labs.", unlocked: false },
  "Gold member": { id: 94, type: "buildings", target: "Alchemy lab", requirement: 100, description: "Have 100 Alchemy Labs.", unlocked: false },
  "The secrets of the universe": { id: 115, type: "buildings", target: "Alchemy lab", requirement: 200, description: "Have 200 Alchemy Labs.", unlocked: false },
  "Gold, Jerry! Gold!": { id: 116, type: "buildings", target: "Alchemy lab", requirement: 300, description: "Have 300 Alchemy Labs.", unlocked: false },

  "First portal": { id: 56, type: "buildings", target: "Portal", requirement: 1, description: "Have 1 Portal.", unlocked: false },
  "Portal network": { id: 57, type: "buildings", target: "Portal", requirement: 5, description: "Have 5 Portals.", unlocked: false },
  "Dimensional gateway": { id: 58, type: "buildings", target: "Portal", requirement: 10, description: "Have 10 Portals.", unlocked: false },
  "Interdimensional network": { id: 59, type: "buildings", target: "Portal", requirement: 20, description: "Have 20 Portals.", unlocked: false },
  "Cookie multiverse": { id: 60, type: "buildings", target: "Portal", requirement: 50, description: "Have 50 Portals.", unlocked: false },
  "Dimensional shift": { id: 95, type: "buildings", target: "Portal", requirement: 100, description: "Have 100 Portals.", unlocked: false },
  "Realm of the Mad God": { id: 117, type: "buildings", target: "Portal", requirement: 200, description: "Have 200 Portals.", unlocked: false },
  "Forbidden zone": { id: 118, type: "buildings", target: "Portal", requirement: 300, description: "Have 300 Portals.", unlocked: false },

  "First trip": { id: 61, type: "buildings", target: "Time machine", requirement: 1, description: "Have 1 Time Machine.", unlocked: false },
  "Time traveler": { id: 62, type: "buildings", target: "Time machine", requirement: 5, description: "Have 5 Time Machines.", unlocked: false },
  "Temporal explorer": { id: 63, type: "buildings", target: "Time machine", requirement: 10, description: "Have 10 Time Machines.", unlocked: false },
  "Time network": { id: 64, type: "buildings", target: "Time machine", requirement: 20, description: "Have 20 Time Machines.", unlocked: false },
  "Master of time": { id: 65, type: "buildings", target: "Time machine", requirement: 50, description: "Have 50 Time Machines.", unlocked: false },
  "Rewriting history": { id: 96, type: "buildings", target: "Time machine", requirement: 100, description: "Have 100 Time Machines.", unlocked: false },
  "Forever and ever": { id: 119, type: "buildings", target: "Time machine", requirement: 200, description: "Have 200 Time Machines.", unlocked: false },
  "cookie clicker forever and forever a hundred years cookie clicker, all day long forever, forever a hundred times, over and over cookie clicker adventures dot com": { id: 120, type: "buildings", target: "Time machine", requirement: 300, description: "Have 300 Time Machines.", unlocked: false },

  "Rebirth": { id: 66, type: "resets", requirement: 1, description: "Reset 1 time.", unlocked: false },
  "Renaissance": { id: 67, type: "resets", requirement: 5, description: "Reset 5 times.", unlocked: false },
  "Resurrection": { id: 68, type: "resets", requirement: 10, description: "Reset 10 times.", unlocked: false },
  "Metempsychosis": { id: 69, type: "resets", requirement: 25, description: "Reset 25 times.", unlocked: false },
  "Apotheosis": { id: 70, type: "resets", requirement: 50, description: "Reset 50 times.", unlocked: false },
  "Reincarnation": { id: 71, type: "resets", requirement: 100, description: "Reset 100 times.", unlocked: false }
};

/* ---------------------------------------------------------------- */
/* Upgrades                                                         */
/* ---------------------------------------------------------------- */

const upgrades = {
  // Cursor upgrades
  "Reinforced index finger": { id: 0, description: "Cursors x2.", price: 100, building: "Cursor", requiredCount: 1, multiplier: 2, bought: false },
  "Carpal tunnel prevention cream": { id: 1, description: "Cursors x2.", price: 500, building: "Cursor", requiredCount: 1, multiplier: 2, requires: 0, bought: false },
  "Ambidextrous": { id: 2, description: "Cursors x2.", price: 10000, building: "Cursor", requiredCount: 10, multiplier: 2, requires: 1, bought: false },

  // Grandma upgrades
  "Forwards from grandma": { id: 3, description: "Grandmas x2.", price: 1000, building: "Grandma", requiredCount: 1, multiplier: 2, bought: false },
  "Steel-plated rolling pins": { id: 4, description: "Grandmas x2.", price: 5000, building: "Grandma", requiredCount: 5, multiplier: 2, requires: 3, bought: false },
  "Lubricated dentures": { id: 5, description: "Grandmas x2.", price: 50000, building: "Grandma", requiredCount: 25, multiplier: 2, requires: 4, bought: false },
  "Prune juice": { id: 6, description: "Grandmas x2.", price: 5000000, building: "Grandma", requiredCount: 50, multiplier: 2, requires: 5, bought: false },
  "Double-thick glasses": { id: 7, description: "Grandmas x2.", price: 500000000, building: "Grandma", requiredCount: 100, multiplier: 2, requires: 6, bought: false },
  "Aging agents": { id: 8, description: "Grandmas x2.", price: 50000000000, building: "Grandma", requiredCount: 150, multiplier: 2, requires: 7, bought: false },
  "Xtreme walkers": { id: 9, description: "Grandmas x2.", price: 50000000000000, building: "Grandma", requiredCount: 200, multiplier: 2, requires: 8, bought: false },

  // Farm upgrades
  "Cheap hoes": { id: 10, description: "Farms x2.", price: 11000, building: "Farm", requiredCount: 1, multiplier: 2, bought: false },
  "Fertilizer": { id: 11, description: "Farms x2.", price: 55000, building: "Farm", requiredCount: 5, multiplier: 2, requires: 10, bought: false },
  "Cookie trees": { id: 12, description: "Farms x2.", price: 550000, building: "Farm", requiredCount: 25, multiplier: 2, requires: 11, bought: false },
  "Genetically-modified cookies": { id: 13, description: "Farms x2.", price: 55000000, building: "Farm", requiredCount: 50, multiplier: 2, requires: 12, bought: false },
  "Gingerbread scarecrows": { id: 14, description: "Farms x2.", price: 5500000000, building: "Farm", requiredCount: 100, multiplier: 2, requires: 13, bought: false },
  "Pulsar sprinklers": { id: 15, description: "Farms x2.", price: 550000000000, building: "Farm", requiredCount: 150, multiplier: 2, requires: 14, bought: false },
  "Fudge fungus": { id: 16, description: "Farms x2.", price: 550000000000000, building: "Farm", requiredCount: 200, multiplier: 2, requires: 15, bought: false },

  // Mine upgrades
  "Sugar gas": { id: 17, description: "Mines x2.", price: 120000, building: "Mine", requiredCount: 1, multiplier: 2, bought: false },
  "Megadrill": { id: 18, description: "Mines x2.", price: 600000, building: "Mine", requiredCount: 5, multiplier: 2, requires: 17, bought: false },
  "Ultradrill": { id: 19, description: "Mines x2.", price: 6000000, building: "Mine", requiredCount: 25, multiplier: 2, requires: 18, bought: false },
  "Ultimadrill": { id: 20, description: "Mines x2.", price: 600000000, building: "Mine", requiredCount: 50, multiplier: 2, requires: 19, bought: false },
  "H-bomb mining": { id: 21, description: "Mines x2.", price: 60000000000, building: "Mine", requiredCount: 100, multiplier: 2, requires: 20, bought: false },
  "Coreforge": { id: 22, description: "Mines x2.", price: 6000000000000, building: "Mine", requiredCount: 150, multiplier: 2, requires: 21, bought: false },
  "Planetsplitters": { id: 23, description: "Mines x2.", price: 6000000000000000, building: "Mine", requiredCount: 200, multiplier: 2, requires: 22, bought: false },

  // Factory upgrades
  "Sturdier conveyor belts": { id: 24, description: "Factories x2.", price: 1300000, building: "Factory", requiredCount: 1, multiplier: 2, bought: false },
  "Child labor": { id: 25, description: "Factories x2.", price: 6500000, building: "Factory", requiredCount: 5, multiplier: 2, requires: 24, bought: false },
  "Sweatshop": { id: 26, description: "Factories x2.", price: 65000000, building: "Factory", requiredCount: 25, multiplier: 2, requires: 25, bought: false },
  "Radium reactors": { id: 27, description: "Factories x2.", price: 6500000000, building: "Factory", requiredCount: 50, multiplier: 2, requires: 26, bought: false },
  "Recombobulators": { id: 28, description: "Factories x2.", price: 650000000000, building: "Factory", requiredCount: 100, multiplier: 2, requires: 27, bought: false },
  "Deep-bake process": { id: 29, description: "Factories x2.", price: 65000000000000, building: "Factory", requiredCount: 150, multiplier: 2, requires: 28, bought: false },
  "Cyborg workforce": { id: 30, description: "Factories x2.", price: 65000000000000000, building: "Factory", requiredCount: 200, multiplier: 2, requires: 29, bought: false },

  // Bank upgrades
  "Dizzy miss lizzy": { id: 31, description: "Banks x2.", price: 14000000, building: "Bank", requiredCount: 1, multiplier: 2, bought: false },
  "A very special dude": { id: 32, description: "Banks x2.", price: 70000000, building: "Bank", requiredCount: 5, multiplier: 2, requires: 31, bought: false },
  "Acid-proof vaults": { id: 33, description: "Banks x2.", price: 700000000, building: "Bank", requiredCount: 25, multiplier: 2, requires: 32, bought: false },
  "Chocolate coins": { id: 34, description: "Banks x2.", price: 70000000000, building: "Bank", requiredCount: 50, multiplier: 2, requires: 33, bought: false },
  "Taller vaults": { id: 35, description: "Banks x2.", price: 7000000000000, building: "Bank", requiredCount: 100, multiplier: 2, requires: 34, bought: false },
  "Sugar gas bank": { id: 36, description: "Banks x2.", price: 700000000000000, building: "Bank", requiredCount: 150, multiplier: 2, requires: 35, bought: false },
  "Snack production": { id: 37, description: "Banks x2.", price: 700000000000000000, building: "Bank", requiredCount: 200, multiplier: 2, requires: 36, bought: false },

  // Temple upgrades
  "Golden idols": { id: 38, description: "Temples x2.", price: 200000000, building: "Temple", requiredCount: 1, multiplier: 2, bought: false },
  "Sacrificial rolling pins": { id: 39, description: "Temples x2.", price: 1000000000, building: "Temple", requiredCount: 5, multiplier: 2, requires: 38, bought: false },
  "Fierce glow": { id: 40, description: "Temples x2.", price: 10000000000, building: "Temple", requiredCount: 25, multiplier: 2, requires: 39, bought: false },
  "Slaughterhouse": { id: 41, description: "Temples x2.", price: 1000000000000, building: "Temple", requiredCount: 50, multiplier: 2, requires: 40, bought: false },
  "Theoretic chocolate": { id: 42, description: "Temples x2.", price: 100000000000000, building: "Temple", requiredCount: 100, multiplier: 2, requires: 41, bought: false },
  "Temple kneading": { id: 43, description: "Temples x2.", price: 10000000000000000, building: "Temple", requiredCount: 150, multiplier: 2, requires: 42, bought: false },
  "Patience abolished": { id: 44, description: "Temples x2.", price: 1000000000000000000, building: "Temple", requiredCount: 200, multiplier: 2, requires: 43, bought: false },

  // Wizard Tower upgrades
  "Pointier hats": { id: 45, description: "Wizard towers x2.", price: 3300000000, building: "Wizard tower", requiredCount: 1, multiplier: 2, bought: false },
  "Beardier beards": { id: 46, description: "Wizard towers x2.", price: 16500000000, building: "Wizard tower", requiredCount: 5, multiplier: 2, requires: 45, bought: false },
  "Ancient grimoires": { id: 47, description: "Wizard towers x2.", price: 165000000000, building: "Wizard tower", requiredCount: 25, multiplier: 2, requires: 46, bought: false },
  "Kitchen curses": { id: 48, description: "Wizard towers x2.", price: 16500000000000, building: "Wizard tower", requiredCount: 50, multiplier: 2, requires: 47, bought: false },
  "School of sorcery": { id: 49, description: "Wizard towers x2.", price: 1650000000000000, building: "Wizard tower", requiredCount: 100, multiplier: 2, requires: 48, bought: false },
  "Dark magic": { id: 50, description: "Wizard towers x2.", price: 165000000000000000, building: "Wizard tower", requiredCount: 150, multiplier: 2, requires: 49, bought: false },
  "Primal chocolate": { id: 51, description: "Wizard towers x2.", price: 16500000000000000000, building: "Wizard tower", requiredCount: 200, multiplier: 2, requires: 50, bought: false },

  // Shipment upgrades
  "Vanilla nebulae": { id: 52, description: "Shipments x2.", price: 102000000000, building: "Shipment", requiredCount: 1, multiplier: 2, bought: false },
  "Wormholes": { id: 53, description: "Shipments x2.", price: 510000000000, building: "Shipment", requiredCount: 5, multiplier: 2, requires: 52, bought: false },
  "Frequent flyer": { id: 54, description: "Shipments x2.", price: 5100000000000, building: "Shipment", requiredCount: 25, multiplier: 2, requires: 53, bought: false },
  "Warp drive": { id: 55, description: "Shipments x2.", price: 510000000000000, building: "Shipment", requiredCount: 50, multiplier: 2, requires: 54, bought: false },
  "Chocolate monoliths": { id: 56, description: "Shipments x2.", price: 51000000000000000, building: "Shipment", requiredCount: 100, multiplier: 2, requires: 55, bought: false },
  "Generation ship": { id: 57, description: "Shipments x2.", price: 5100000000000000000, building: "Shipment", requiredCount: 150, multiplier: 2, requires: 56, bought: false },
  "Dyson sphere": { id: 58, description: "Shipments x2.", price: 510000000000000000000, building: "Shipment", requiredCount: 200, multiplier: 2, requires: 57, bought: false },

  // Alchemy Lab upgrades
  "Antimony": { id: 59, description: "Alchemy labs x2.", price: 1500000000000, building: "Alchemy lab", requiredCount: 1, multiplier: 2, bought: false },
  "Essence of dough": { id: 60, description: "Alchemy labs x2.", price: 7500000000000, building: "Alchemy lab", requiredCount: 5, multiplier: 2, requires: 59, bought: false },
  "True chocolate": { id: 61, description: "Alchemy labs x2.", price: 75000000000000, building: "Alchemy lab", requiredCount: 25, multiplier: 2, requires: 60, bought: false },
  "Ambrosia": { id: 62, description: "Alchemy labs x2.", price: 7500000000000000, building: "Alchemy lab", requiredCount: 50, multiplier: 2, requires: 61, bought: false },
  "Aqua crustulae": { id: 63, description: "Alchemy labs x2.", price: 750000000000000000, building: "Alchemy lab", requiredCount: 100, multiplier: 2, requires: 62, bought: false },
  "Origin crucible": { id: 64, description: "Alchemy labs x2.", price: 7500000000000000000000, building: "Alchemy lab", requiredCount: 200, multiplier: 2, requires: 63, bought: false },

  // Portal upgrades
  "Elder pact": { id: 65, description: "Portals x2.", price: 1500000000000, building: "Portal", requiredCount: 1, multiplier: 2, bought: false },
  "Labyrinth": { id: 66, description: "Portals x2.", price: 7500000000000, building: "Portal", requiredCount: 5, multiplier: 2, requires: 65, bought: false },
  "Neverclick": { id: 67, description: "Portals x2.", price: 75000000000000, building: "Portal", requiredCount: 25, multiplier: 2, requires: 66, bought: false },
  "Heavenly chip secret": { id: 68, description: "Portals x2.", price: 7500000000000000, building: "Portal", requiredCount: 50, multiplier: 2, requires: 67, bought: false },
  "Arcane aura": { id: 69, description: "Portals x2.", price: 750000000000000000, building: "Portal", requiredCount: 100, multiplier: 2, requires: 68, bought: false },
  "The final frontier": { id: 70, description: "Portals x2.", price: 75000000000000000000, building: "Portal", requiredCount: 150, multiplier: 2, requires: 69, bought: false },
  "Cookie dimensionality": { id: 71, description: "Portals x2.", price: 7500000000000000000000, building: "Portal", requiredCount: 200, multiplier: 2, requires: 70, bought: false },

  // Time Machine upgrades
  "Flux capacitor": { id: 72, description: "Time machines x2.", price: 14000000000000, building: "Time machine", requiredCount: 1, multiplier: 2, bought: false },
  "Time paradox resolver": { id: 73, description: "Time machines x2.", price: 70000000000000, building: "Time machine", requiredCount: 5, multiplier: 2, requires: 72, bought: false },
  "Quantum chocolatification": { id: 74, description: "Time machines x2.", price: 700000000000000, building: "Time machine", requiredCount: 25, multiplier: 2, requires: 73, bought: false },
  "Causality enforcer": { id: 75, description: "Time machines x2.", price: 70000000000000000, building: "Time machine", requiredCount: 50, multiplier: 2, requires: 74, bought: false },
  "Golden verse": { id: 76, description: "Time machines x2.", price: 7000000000000000000, building: "Time machine", requiredCount: 100, multiplier: 2, requires: 75, bought: false },
  "Eternal cycle": { id: 77, description: "Time machines x2.", price: 700000000000000000000, building: "Time machine", requiredCount: 150, multiplier: 2, requires: 76, bought: false },
  "Recursive causality": { id: 78, description: "Time machines x2.", price: 70000000000000000000000, building: "Time machine", requiredCount: 200, multiplier: 2, requires: 77, bought: false },

  // Golden Cookies upgrades
  "Golden Cookies": { id: 79, description: "Randomly spawns a Golden Cookie", price: 100000, building: "GC", requiredCount: 1, multiplier: 1, bought: false },
  "Lucky Day": { id: 80, description: "GC appears twice as often and stay twice as long", price: 10000000, building: "GC", requiredCount: 1, multiplier: 1, bought: false, requires: 79 },
  "Serendipity": { id: 81, description: "GC appears twice as often and stay twice as long", price: 1000000000, building: "GC", requiredCount: 1, multiplier: 1, bought: false, requires: 80 },
  "Get Lucky": { id: 82, description: "GC appears twice as often", price: 100000000000, building: "GC", requiredCount: 1, multiplier: 1, bought: false, requires: 81 },

  // Kitten upgrades
  "Kitten helpers": { id: 83, description: "Production x1.5.", price: 9000000, building: "kitten", requiredAchievements: 13, multiplier: 1.5, bought: false },
  "Kitten workers": { id: 84, description: "Production x1.75.", price: 900000000, building: "kitten", requiredAchievements: 25, multiplier: 1.75, bought: false, requires: 83 },
  "Kitten engineers": { id: 85, description: "Production x2.", price: 90000000000, building: "kitten", requiredAchievements: 50, multiplier: 2, bought: false, requires: 84 },
  "Kitten overseers": { id: 86, description: "Production x2.5.", price: 9000000000000, building: "kitten", requiredAchievements: 75, multiplier: 2.5, bought: false, requires: 85 },
  "Kitten managers": { id: 87, description: "Production x3.", price: 900000000000000, building: "kitten", requiredAchievements: 100, multiplier: 3, bought: false, requires: 86 },

  // Synergy upgrades
  "Synergies vol. I": { id: 88, description: "A tome on building synergies. No effect yet.", price: 1000000000000, building: "synergies", bought: false },
  "Synergies vol. II": { id: 89, description: "A weighty tome on building synergies. No effect yet.", price: 1000000000000000, building: "synergies", bought: false, requires: 88 },
  "Future almanacs": { id: 90, description: "Farms gain +5% CpS per time machine. Time machines gain +0.1% CpS per farm. Lets you predict optimal planting times.", price: 2800000000000000000, building: "synergies", requiredBuildings: { Farm: 15, "Time machine": 15 }, effect: { Farm: { "Time machine": 0.05 }, "Time machine": { Farm: 0.001 } }, requires: 88, bought: false },
  "Seismic magic": { id: 91, description: "Mines gain +5% CpS per wizard tower. Wizard towers gain +0.1% CpS per mine. Surprise earthquakes are an old favorite of wizardly frat houses.", price: 66024000000000, building: "synergies", requiredBuildings: { Mine: 15, "Wizard tower": 15 }, effect: { Mine: { "Wizard tower": 0.05 }, "Wizard tower": { Mine: 0.001 } }, requires: 88, bought: false },
  "Contracts from beyond": { id: 92, description: "Banks gain +5% CpS per portal. Portals gain +0.1% CpS per bank. Make sure to read the fine print!", price: 200003000000000000, building: "synergies", requiredBuildings: { Bank: 15, Portal: 15 }, effect: { Bank: { Portal: 0.05 }, Portal: { Bank: 0.001 } }, requires: 88, bought: false },
  "Paganism": { id: 93, description: "Temples gain +5% CpS per portal. Portals gain +0.1% CpS per temple. Some deities are better left unworshipped.", price: 200040000000000000, building: "synergies", requiredBuildings: { Temple: 15, Portal: 15 }, effect: { Temple: { Portal: 0.05 }, Portal: { Temple: 0.001 } }, requires: 88, bought: false },
  "Arcane knowledge": { id: 94, description: "Wizard towers gain +5% CpS per alchemy lab. Alchemy labs gain +0.1% CpS per wizard tower. Some things were never meant to be known - only mildly speculated.", price: 15660000000000000, building: "synergies", requiredBuildings: { "Wizard tower": 15, "Alchemy lab": 15 }, effect: { "Wizard tower": { "Alchemy lab": 0.05 }, "Alchemy lab": { "Wizard tower": 0.001 } }, requires: 88, bought: false },
  "Fossil fuels": { id: 95, description: "Mines gain +5% CpS per shipment. Shipments gain +0.1% CpS per mine. Extracted from the fuels of ancient, fossilized civilizations.", price: 1020000000000000, building: "synergies", requiredBuildings: { Mine: 15, Shipment: 15 }, effect: { Mine: { Shipment: 0.05 }, Shipment: { Mine: 0.001 } }, requires: 88, bought: false },
  "Primordial ores": { id: 96, description: "Mines gain +5% CpS per alchemy lab. Alchemy labs gain +0.1% CpS per mine. Only the purest metals yield the sweetest sap of the earth.", price: 15000000000000000, building: "synergies", requiredBuildings: { Mine: 15, "Alchemy lab": 15 }, effect: { Mine: { "Alchemy lab": 0.05 }, "Alchemy lab": { Mine: 0.001 } }, requires: 88, bought: false },
  "Infernal crops": { id: 97, description: "Farms gain +5% CpS per portal. Portals gain +0.1% CpS per farm. Sprinkle regularly with FIRE.", price: 200000000000000000, building: "synergies", requiredBuildings: { Farm: 15, Portal: 15 }, effect: { Farm: { Portal: 0.05 }, Portal: { Farm: 0.001 } }, requires: 88, bought: false },
  "Relativistic parsec-skipping": { id: 98, description: "Shipments gain +5% CpS per time machine. Time machines gain +0.1% CpS per shipment. You don't want these naysayers on your ship.", price: 2810000000000000000, building: "synergies", requiredBuildings: { Shipment: 15, "Time machine": 15 }, effect: { Shipment: { "Time machine": 0.05 }, "Time machine": { Shipment: 0.001 } }, requires: 88, bought: false },
  "Rain prayer": { id: 99, description: "Farms gain +5% CpS per temple. Temples gain +0.1% CpS per farm. A deeply spiritual ceremonial with complicated dance moves.", price: 4002000000000000000, building: "synergies", requiredBuildings: { Farm: 75, Temple: 75 }, effect: { Farm: { Temple: 0.05 }, Temple: { Farm: 0.001 } }, requires: 89, bought: false },
  "Asteroid mining": { id: 100, description: "Mines gain +5% CpS per shipment. Shipments gain +0.1% CpS per mine. The 1974 United Cosmic Convention forbids it, but a space bribe goes a long way.", price: 1020000000000000000000, building: "synergies", requiredBuildings: { Mine: 75, Shipment: 75 }, effect: { Mine: { Shipment: 0.05 }, Shipment: { Mine: 0.001 } }, requires: 89, bought: false },
  "Temporal overclocking": { id: 101, description: "Factories gain +5% CpS per time machine. Time machines gain +0.1% CpS per factory. More quickitude for increased speedation of fastness.", price: 2800000000000000000000000, building: "synergies", requiredBuildings: { Factory: 75, "Time machine": 75 }, effect: { Factory: { "Time machine": 0.05 }, "Time machine": { Factory: 0.001 } }, requires: 89, bought: false },
  "Printing presses": { id: 102, description: "Factories gain +5% CpS per bank. Banks gain +0.1% CpS per factory. Fake bills so real, they're almost worth the ink.", price: 540000000000000000, building: "synergies", requiredBuildings: { Bank: 75, Factory: 75 }, effect: { Factory: { Bank: 0.05 }, Bank: { Factory: 0.001 } }, requires: 89, bought: false },
  "Magical botany": { id: 103, description: "Farms gain +5% CpS per wizard tower. Wizard towers gain +0.1% CpS per farm. Already known in some newspapers as the wizard's GMOs.", price: 66002000000000000000, building: "synergies", requiredBuildings: { Farm: 75, "Wizard tower": 75 }, effect: { Farm: { "Wizard tower": 0.05 }, "Wizard tower": { Farm: 0.001 } }, requires: 89, bought: false },
  "Shipyards": { id: 104, description: "Factories gain +5% CpS per shipment. Shipments gain +0.1% CpS per factory. Carpentry, blind luck, and asbestos insulation unite.", price: 1020000000000000000000, building: "synergies", requiredBuildings: { Factory: 75, Shipment: 75 }, effect: { Factory: { Shipment: 0.05 }, Shipment: { Factory: 0.001 } }, requires: 89, bought: false },
  "Gold fund": { id: 105, description: "Banks gain +5% CpS per alchemy lab. Alchemy labs gain +0.1% CpS per bank. If gold is the economy's backbone, cookies are its hip joints.", price: 15003000000000000000000, building: "synergies", requiredBuildings: { Bank: 75, "Alchemy lab": 75 }, effect: { Bank: { "Alchemy lab": 0.05 }, "Alchemy lab": { Bank: 0.001 } }, requires: 89, bought: false },
};

const upgradeList = Object.values(upgrades);
const buildingNames = Object.keys(buildings);

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
  building.bulkPrice10 = getBulkBuildingPrice(name, 10);
  building.bulkPrice100 = getBulkBuildingPrice(name, 100);
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

  prestige = Math.min(prestige, calculatePrestige());

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

    building.bulkPrice10 = getBulkBuildingPrice(name, 10);
    building.bulkPrice100 = getBulkBuildingPrice(name, 100);
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

  globalMultiplier = 1;

  (data.upgrades || []).forEach(name => {
    const upgrade = upgrades[name];
    if (!upgrade) return;

    upgrade.bought = true;
    applyUpgradeMultiplier(upgrade);

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
  invalidateGainCache();
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

  prestige = calculatePrestige();
  resetCount++;
  localStorage.setItem(SAVE_KEY, resetSaveString());

  location.reload();
}

/* ---------------------------------------------------------------- */
/* Cookie clicking and production                                   */
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
    * goldenCookieCpsMultiplier
    * globalMultiplier;
}

function clickCookie() {
  const amount = getCursorClickGain();

  cookies += amount;
  cookiesBakedAllTime += amount;

  if (pops.length < 260 && settings.numbersOn) {
    new Pop("cookie", "+" + beautify(amount));
  }
}

function getSynergyMultiplier(name) {
  ensureGainCache();

  if (cachedSynergy[name] !== undefined) return cachedSynergy[name];

  let multiplier = 1;

  for (const upgrade of upgradeList) {
    const coefficients = !upgrade.bought ? null : upgrade.effect?.[name];
    if (!coefficients) continue;

    for (const [partner, coefficient] of Object.entries(coefficients)) {
      multiplier += coefficient * getBuildingCount(partner);
    }
  }

  cachedSynergy[name] = multiplier;
  return multiplier;
}

function getBuildingGain(name) {
  return buildings[name].gain * multipliers[name] * getSynergyMultiplier(name) * goldenCookieCpsMultiplier * globalMultiplier;
}

function addCookies(amount, elementId) {
  amount *= prestige + 1;
  cookies += amount;
  cookiesBakedAllTime += amount;

  if (elementId && pops.length < 250 && settings.numbersOn) {
    new Pop(elementId, "+" + beautify(amount));
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

function produceBuildingCookies(name, elementId) {
  const count = buildings[name].count;
  if (!count) return;

  const interval = Math.max(1, Math.ceil(150 / count));

  if (ticks % interval === 0) {
    addCookies(getBuildingGain(name), elementId);
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
  ensureGainCache();

  if (cachedCps !== null) return cachedCps;

  let cps = getCursorCps();

  buildingNames.forEach(name => {
    if (name === "Cursor") return;

    const count = buildings[name].count;
    if (!count) return;

    cps += count * getBuildingGain(name) / 5;
  });

  cachedCps = cps;
  return cps;
}

/* ---------------------------------------------------------------- */
/* Prestige                                                         */
/* ---------------------------------------------------------------- */

function calculatePrestige() {
  return Math.max(
    0,
    Math.floor(
      (-1 + Math.sqrt(1 + 8 * (cookiesBakedAllTime / 100000000))) / 2
    )
  );
}

/* ---------------------------------------------------------------- */
/* Store                                                            */
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
        <div class="buySub buy10" data-name="${name}" data-buymulti="10" title="Buy 10">x10</div>
        <div class="buySub buy100" data-name="${name}" data-buymulti="100" title="Buy 100">x100</div>
      </div>
    `;
  });


  getElement("store").innerHTML = output;

  storeBuyElements = {};
  storeBulkElements = {};
  getElement("store").querySelectorAll("[data-buy]").forEach(element => {
    storeBuyElements[element.dataset.buy] = element;
  });
  getElement("store").querySelectorAll("[data-buymulti]").forEach(element => {
    const amount = Number(element.dataset.buymulti);
    (storeBulkElements[element.dataset.name] ??= {})[amount] = element;
  });

  storeToRebuild = false;
}

function setupStoreDelegation() {
  getElement("store").addEventListener("click", event => {
    const multiButton = event.target.closest("[data-buymulti]");
    if (multiButton) {
      buyBuildings(multiButton.dataset.name, Number(multiButton.dataset.buymulti));
      return;
    }

    const target = event.target.closest("[data-buy]");
    if (target) buyBuilding(target.dataset.buy);
  });
}

function getBulkBuildingPrice(name, amount) {
  const building = getBuilding(name);
  if (!building) return 0;

  let total = 0;
  for (let i = 0; i < amount; i++) {
    total += Math.ceil(
      building.basePrice * Math.pow(1.1, building.count + i)
    );
  }

  return total;
}

function buyBuildings(name, amount) {
  const building = getBuilding(name);
  if (!building || !loaded || amount <= 0) return;

  const totalPrice = getBulkBuildingPrice(name, amount);
  if (cookies < totalPrice) return;

  cookies -= totalPrice;
  building.count += amount;

  updateBuildingPrice(name);
  rebuildStore();
  refreshAllBuildingVisuals();
  invalidateGainCache();

  upgradesToRebuild = true;
}

function buyBuilding(name) {
  const building = getBuilding(name);
  if (!building || !loaded || cookies < building.currentPrice) return;

  cookies -= building.currentPrice;
  building.count++;

  updateBuildingPrice(name);
  rebuildStore();
  refreshAllBuildingVisuals();
  invalidateGainCache();

  upgradesToRebuild = true;
}

function updateStoreAffordability() {
  Object.keys(storeBuyElements).forEach(name => {
    const element = storeBuyElements[name];
    if (!element) return;

    const building = buildings[name];

    element.classList.toggle("grayed", cookies < building.currentPrice);

    const bulk = storeBulkElements[name];
    if (!bulk) return;

    if (bulk[10]) bulk[10].classList.toggle("grayed", cookies < building.bulkPrice10);
    if (bulk[100]) bulk[100].classList.toggle("grayed", cookies < building.bulkPrice100);
  });
}

/* ---------------------------------------------------------------- */
/* Store tooltips                                                   */
/* ---------------------------------------------------------------- */

function positionStoreTooltip(item) {
  const tooltip = item.querySelector(".tooltipTextStore");
  if (!tooltip) return;

  const rect = item.getBoundingClientRect();
  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;

  let left = rect.left - tooltipWidth - 6;
  const top = rect.top + rect.height / 2 - tooltipHeight / 2;

  if (left < 6) left = rect.right + 6;

  tooltip.style.left = left + "px";
  tooltip.style.top = top + "px";
}

function setupStoreTooltips() {
  const itemSelector = "#store > div, #store_upgrades > div";

  document.addEventListener("mouseover", event => {
    const item = event.target.closest(itemSelector);
    if (item) positionStoreTooltip(item);
  });

  const repositionHovered = () => {
    const hovered = document.querySelector(itemSelector + ":hover");
    if (hovered) positionStoreTooltip(hovered);
  };

  window.addEventListener("resize", repositionHovered);

  const panel = getElement("rightPanel");
  if (panel) {
    panel.addEventListener("scroll", repositionHovered);
  }
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

  if (upgrade.requiredAchievements !== undefined) {
    const unlockedCount = Object.values(achievements)
      .filter(achievement => achievement.unlocked).length;

    if (unlockedCount < upgrade.requiredAchievements) {
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

  if (upgrade.requiredBuildings) {
    for (const [buildingName, required] of Object.entries(upgrade.requiredBuildings)) {
      const building = buildings[buildingName];
      if (!building || building.count < required) return false;
    }
  }

  return true;
}

function applyUpgradeMultiplier(upgrade) {
  if (upgrade.building === "GC" || upgrade.building === "synergies") return;

  if (upgrade.building === "kitten") {
    globalMultiplier *= upgrade.multiplier;
  } else {
    multipliers[upgrade.building] *= upgrade.multiplier;
  }
}

function buyUpgrade(name) {
  const upgrade = upgrades[name];

  if (!upgrade || !isUpgradeAvailable(upgrade) || upgrade.bought || !loaded || cookies < upgrade.price) return;

  cookies -= upgrade.price;
  upgrade.bought = true;

  applyUpgradeMultiplier(upgrade);
  invalidateGainCache();

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
    .sort(([, a], [, b]) => a.price - b.price)
    .forEach(([name, upgrade]) => {

      // Upgrade filtering
      if (upgrade.building === "GC") {
        upgrade.icon = upgrade.building + "icon.png";
      } else if (upgrade.building === "kitten") {
        upgrade.icon = "kittensicon.png";
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

  upgradeRowElements = {};
  getElement("store_upgrades").querySelectorAll("[data-upgrade]").forEach(element => {
    upgradeRowElements[element.dataset.upgrade] = element;
  });
  upgradeRowElements.pledge = getElement("buyElderPledge");

  upgradesToRebuild = false;
}

function setupStoreUpgradesDelegation() {
  getElement("store_upgrades").addEventListener("click", event => {
    if (event.target.closest("#buyElderPledge")) {
      buyElderPledge();
      return;
    }

    const target = event.target.closest("[data-upgrade]");
    if (target) buyUpgrade(target.dataset.upgrade);
  });
}

function updateUpgradeAffordability() {
  Object.keys(upgradeRowElements).forEach(name => {
    const element = upgradeRowElements[name];
    if (!element) return;

    if (name === "pledge") {
      element.classList.toggle(
        "grayed",
        pledge > 0 || cookies < elderPledge.currentPrice
      );
      return;
    }

    const upgrade = upgrades[name];
    if (!upgrade || upgrade.bought || element.classList.contains("hidden")) return;

    element.classList.toggle("grayed", cookies < upgrade.price);
  });
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
  invalidateGainCache();
  upgradesToRebuild = true;
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
    getElement("pledgeTimer").innerHTML = "666";
  }
}

/* ---------------------------------------------------------------- */
/* Building rendering                                               */
/* ---------------------------------------------------------------- */

let lastRenderedCursorCount = -1;

function renderCursors() {
  const count = buildings.Cursor.count;
  if (count === lastRenderedCursorCount) return;

  lastRenderedCursorCount = count;
  const cookie = getElement("cookie");

  if (!count) {
    cookie.innerHTML = "";
    return;
  }

  let output = "";

  for (let i = 0; i < count; i++) {
    const rotation = -Math.floor((360 / count) * i);
    const x = Math.floor(64 + Math.sin((Math.PI * 2 / count) * i) * 64) - 16;
    const y = Math.floor(64 + Math.cos((Math.PI * 2 / count) * i) * 64) - 16;
    const bobDelay = Math.ceil((150 / count) * i) / 30;

    output += `
      <div class="cursor"
        style="left:${x}px;top:${y}px;--cursor-rot:${rotation}deg;animation-delay:-${bobDelay}s;"
        data-cursor>
      </div>
    `;
  }

  cookie.innerHTML = output;
}

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

/* ---------------------------------------------------------------- */
/* Golden Cookies                                                   */
/* ---------------------------------------------------------------- */

function spawnGoldenCookie() {
  // Safety: never spawn two golden cookies at once.
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

  // Schedule the golden cookie to disappear.
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
  // Only active once the upgrade has been bought.
  if (!upgrades["Golden Cookies"]?.bought) return;

  // Never schedule a new golden cookie while one is already present.
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

  new Pop("credits", `Lucky! +${beautify(Math.floor(reward))} cookies`);
}

function goldenCookieFrenzy() {
  goldenCookieCpsMultiplier = 7;
  goldenCookieFrenzyTimer = 77 * TICKS_PER_SECOND;
  invalidateGainCache();
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

/* ---------------------------------------------------------------- */
/* Buffs display                                                    */
/* ---------------------------------------------------------------- */

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

function getPopAnchor(elementId) {
  const cached = popAnchors[elementId];
  if (cached) return cached;

  const element = getElement(elementId);
  if (!element) return { x: 0, y: 0 };

  const rect = element.getBoundingClientRect();
  const anchor = {
    x: (rect.left + rect.right) / 2,
    y: (rect.top + rect.bottom) / 2
  };

  popAnchors[elementId] = anchor;
  return anchor;
}

function Pop(elementId, text) {
  this.elementId = elementId;
  this.text = text;
  this.life = 0;
  this.offsetX = Math.floor(Math.random() * 20 - 10);
  this.offsetY = Math.floor(Math.random() * 20 - 10);

  const anchor = getPopAnchor(elementId);
  this.anchorX = anchor.x;
  this.anchorY = anchor.y;

  pops.push(this);
}

function refreshPopAnchors() {
  Object.keys(popAnchors).forEach(key => delete popAnchors[key]);

  for (let i = pops.length - 1; i >= 0; i--) {
    const pop = pops[i];
    const element = getElement(pop.elementId);
    if (!element) {
      pops.splice(i, 1);
      continue;
    }

    const anchor = getPopAnchor(pop.elementId);
    pop.anchorX = anchor.x;
    pop.anchorY = anchor.y;
  }
}

function renderPops() {
  if (pops.length === 0) return;

  let output = "";

  for (let i = pops.length - 1; i >= 0; i--) {
    const pop = pops[i];

    const x = Math.floor(pop.anchorX + pop.offsetX) - 100;
    const y = Math.floor(
      pop.anchorY
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
  const backdrop = getElement("eldersBackdrop");

  whole.style.background = "#ccc";
  if (backdrop) backdrop.style.background = "";

  if (cookies >= 1000000 && pledge <= 0 && settings.flashing) {
    const intensity = (cookies - 1000000) / 2000000;
    const intensity2 = Math.max(0, (cookies - 100000000) / 400000000);
    let icon = "grandmaicon";

    if (cookies >= 2000000) {
      if (Math.random() < 0.02) icon = "grandmaiconinvert";
      else if (Math.random() < 0.02) icon = "grandmaiconlustful";
    }

    if (cookies >= 10000000 && Math.random() < 0.02) icon = "skellington";

    if (backdrop && cookies >= 1000000000) {
      backdrop.style.background =
        `url(kaleigrandma.png) ${Math.floor(ticks * 0.2)}px -${Math.floor(ticks * 0.1)}px`;
    } else if (backdrop && Math.random() < intensity) {
      backdrop.style.background =
        `url(${icon}.png) ${Math.floor(Math.random() * 4)}px ${Math.floor(Math.random() * 4)}px`;
      backdrop.style.backgroundSize =
        `${Math.floor(intensity2 * Math.random() * 64 + 64)}px ` +
        `${Math.floor(intensity2 * Math.random() * 64 + 64)}px`;
    }
  }
}

/* ---------------------------------------------------------------- */
/* Results overlay                                                  */
/* ---------------------------------------------------------------- */

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
    { version: "0.134", date: "17/09/2026", notes: ["optimizing runtime and adding a few tweaks"] },
    { version: "0.133", notes: ["making Alek's gameplay harder"] },
    { version: "0.132", notes: ["adding achievements and cleaning code"] },
    { version: "0.131f", notes: ["I'm bored"] },
    { version: "0.131e", notes: ["fixing prestige, adding kittens"] },
    { version: "0.131b", notes: ["adding icons, minor bug fixes, idling tests"] },
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
  const bought = Object.values(upgrades).filter(u => u.bought).length;
  const total = Object.keys(upgrades).length;

  const header = `
    <div class="overlayAchievementsHeader">Upgrades ${bought}/${total}</div>
  `;

  getElement("overlayUpgradesList").innerHTML = header + Object.entries(upgrades).map(([name, upgrade]) => {
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
  const unlocked = Object.values(achievements).filter(a => a.unlocked).length;
  const total = Object.keys(achievements).length;

  const header = `
    <div class="overlayAchievementsHeader">Achievements ${unlocked}/${total}</div>
  `;

  getElement("overlayAchievementsList").innerHTML = header + Object.entries(achievements).map(([name, achievement]) => {
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

function loadSettings() {
  let stored = {};

  try {
    stored = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch (e) {
    stored = {};
  }

  Object.keys(defaultSettings).forEach(key => {
    const value = stored[key];
    const defaultValue = defaultSettings[key];
    settings[key] =
      typeof value === typeof defaultValue && value !== undefined
        ? value
        : defaultValue;
  });
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function getBakeryDisplayName() {
  return settings.bakeryName || "Cookie";
}

function refreshBakeryName() {
  setElementText("bakeryName", getBakeryDisplayName() + "'s bakery");
}

function ensureBakeryName() {
  if (settings.bakeryName) {
    refreshBakeryName();
    return;
  }

  const name = prompt("Welcome! What is the name of your bakery?");
  settings.bakeryName = (name === null ? "" : name.trim()) || "Cookie";

  saveSettings();
  refreshBakeryName();
}

function changeBakeryName() {
  const name = prompt(
    "Enter a new name for your bakery:",
    getBakeryDisplayName()
  );
  if (name === null) return;

  settings.bakeryName = name.trim() || "Cookie";
  saveSettings();
  refreshBakeryName();
}

function applySettingsToUI() {
  getElement("toggleNumbers").innerHTML =
    settings.numbersOn ? "Numbers On" : "Numbers Off";
  getElement("toggleFlash").innerHTML =
    settings.flashing ? "Flashing On" : "Flashing Off";
}

function toggleNumbers() {
  settings.numbersOn = !settings.numbersOn;
  applySettingsToUI();
  saveSettings();
}

function toggleFlash() {
  settings.flashing = !settings.flashing;
  applySettingsToUI();
  saveSettings();
}

/* ---------------------------------------------------------------- */
/* Idle handling                                                    */
/* ---------------------------------------------------------------- */

// Catch-up loop extracted into its own reusable function.
function catchUpIdleTime() {
  const now = performance.now();
  const elapsedSeconds = Math.min((now - lastTickTimestamp) / 1000, MAX_OFFLINE_SECONDS);
  lastTickTimestamp = now;
  const missedTicks = Math.max(0, Math.floor(elapsedSeconds * TICKS_PER_SECOND) - 1);
  if (missedTicks <= 0) return 0;

  const gained = getCookiesPerSecond() * (missedTicks / TICKS_PER_SECOND);
  cookies += gained;
  cookiesBakedAllTime += gained;
  ticks += missedTicks;
  saveTimer -= missedTicks;
  pledge = Math.max(0, pledge - missedTicks);
  goldenCookieFrenzyTimer = Math.max(0, goldenCookieFrenzyTimer - missedTicks);
  goldenCookieClickFrenzyTimer = Math.max(0, goldenCookieClickFrenzyTimer - missedTicks);
  cookiesGainedWhileHidden += gained;

  return gained;
}

function updateTitle() {
  document.title = beautify(cookies) + " cookies - Cookie Clicker";
}

function handleVisibilityChange() {
  if (document.hidden) {
    document.title = "Idling... - Cookie Clicker";
    cookiesGainedWhileHidden = 0;
    return;
  }
  // Simple flag, no computation here; catch-up happens in main().
  cameBackFromIdle = true;
}

/* ---------------------------------------------------------------- */
/* Main game loop                                                   */
/* ---------------------------------------------------------------- */

function main() {
  invalidateGainCache();
  catchUpIdleTime();

  if (cameBackFromIdle) {
    cameBackFromIdle = false;
    if (cookiesGainedWhileHidden > 0) {
      new Pop("credits", "Oh, you're back! Here are your cookies: " + beautify(Math.round(cookiesGainedWhileHidden)));
    }
    cookiesGainedWhileHidden = 0;
    updateTitle();
  }

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

  // Golden cookie timers.
  if (goldenCookieFrenzyTimer > 0) {
    goldenCookieFrenzyTimer--;

    if (goldenCookieFrenzyTimer <= 0) {
      goldenCookieFrenzyTimer = 0;
      goldenCookieCpsMultiplier = 1;
      invalidateGainCache();
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

  if (ticks % 30 === 0) checkAchievements();

  const floater = Math.round(cps * 10 - Math.floor(cps) * 10);

  setElementText(
    "cps",
    "Cookies per second : " +
    beautify(cps) +
    (cps < 1e6 && floater ? "." + floater : "")
  );

  updateStoreAffordability();
  updateUpgradeAffordability();

  cookiesDisplay += (cookies - cookiesDisplay) * 0.5;
  setElementText("money", beautify(Math.round(cookiesDisplay)));
  setElementText("comment", getComment(cookies));

  updatePledgeTimer();

  setElementText("prestigeDisplay", prestige);
  setElementText("prestigeGainDisplay", Math.max(0, calculatePrestige() - prestige));
  setElementText("resetCounterDisplay", resetCount);
  setElementText("overlayAllTimeCookies", "Cookies baked (all time): " + beautify(cookiesBakedAllTime));

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
/* Initialization                                                   */
/* ---------------------------------------------------------------- */

function initialize() {
  initializeBuildingPrices();
  loadSettings();
  applySettingsToUI();
  ensureBakeryName();

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("resize", refreshPopAnchors);

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
  getElement("changeBakeryName").addEventListener("click", changeBakeryName);

  setupStoreDelegation();
  setupStoreUpgradesDelegation();

  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveGame();
    }
  });

  initOverlay();
  createBuffDisplay();
  setupStoreTooltips();
  loadGame();
}

window.addEventListener("load", initialize);
