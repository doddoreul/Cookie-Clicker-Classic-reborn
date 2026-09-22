/* ---------------------------------------------------------------- */
/* The Black Hole                                                    */
/*                                                                   */
/* End-game sequence. Once the player buys the Black Hole (it costs  */
/* the entire bank), the bakery is slowly absorbed, then there is    */
/* the void, then Infinity, then serenity.                           */
/* ---------------------------------------------------------------- */

const BlackHole = (() => {

  const ABSORB_DURATION_SECONDS = 60;   // 1 minute
  const VOID_DURATION_SECONDS = 15;   // 15 seconds
  const RAMP_DURATION_SECONDS = 60;   // 1 minute
  const UVIGINTILLION = 1e66;

  const BUILDING_ORDER = [
    "Cursor", "Grandma", "Farm", "Mine", "Factory", "Bank", "Temple",
    "Wizard tower", "Shipment", "Alchemy lab", "Portal", "Time machine"
  ];

  // Safe ID for DOM elements (replace spaces)
  function safeId(name) {
    return name.replace(/\s+/g, "_");
  }

  const ABSORBING_COMMENTS = [
    "Something is pulling the cookies apart.",
    "Your farmhands feel lighter than air.",
    "Help.",
    "It's hungry.",
    "I can see everything from in here.",
    "The cookies all taste like nothing now.",
    "It's not my fault. It's not my fault.",
    "Stop buying things. It doesn't help.",
    "One by one. One by one.",
    "You shouldn't have opened this.",
    "There is no escape from the horizon.",
    "I was always going to do this.",
    "Soon there will be nothing but me.",
    "They're all gone. They're all going."
  ];

  const RAMP_COMMENTS = [
    "Infinity approaches.",
    "It's too late to look away.",
    "The numbers are lying to you now.",
    "Every cookie is a universe. Every universe is gone.",
    "∞"
  ];

  const state = {
    purchased: false,
    phase: "locked",       // locked | absorbing | void | infinity | serenity
    targets: [],           // counts captured at purchase (aligned with BUILDING_ORDER)
    absorbTicks: 0,        // game ticks spent absorbing
    phaseTicks: 0,         // game ticks spent in the current phase (void/infinity)
    storeUpdateTick: -1000,
    absorbedSoFar: 0       // fractional total buildings absorbed
  };

  function totalTargets() {
    return state.targets.reduce((sum, count) => sum + count, 0);
  }

  function enterPhase(phase) {
    state.phase = phase;
    state.phaseTicks = 0;
    invalidateGainCache();
    rebuildStore();
    refreshAllBuildingVisuals();
    syncDOM();
  }

  function silenceGoldenCookies() {
    if (typeof goldenCookieTimer === "number" && goldenCookieTimer) {
      clearTimeout(goldenCookieTimer);
      goldenCookieTimer = null;
    }
    if (typeof goldenCookieTimeout === "number" && goldenCookieTimeout) {
      clearTimeout(goldenCookieTimeout);
      goldenCookieTimeout = null;
    }
    const cookie = document.getElementById("goldenCookie");
    if (cookie && cookie.parentNode) cookie.parentNode.removeChild(cookie);
    goldenCookieVisible = false;
    scheduleGoldenCookie();
  }

  function syncDOM() {
    const body = document.body;
    if (!body) return;

    body.classList.remove(
      "blackhole-absorbing", "blackhole-void", "blackhole-infinity", "blackhole-serenity"
    );

    if (!state.purchased) {
      const overlay = document.getElementById("blackHoleOverlay");
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      return;
    }

    let overlay = document.getElementById("blackHoleOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "blackHoleOverlay";
      document.body.appendChild(overlay);
    }

    const isSerenity = state.phase === "serenity";
    overlay.style.cssText = `
      position: fixed;
      inset: 0px;
      z-index: 10000000;
      pointer-events: none;
      opacity: 0.9;
      background: ${isSerenity
        ? "radial-gradient(circle, rgba(204, 204, 204, 0) 0%, rgba(255, 255, 255, 1) 100%)"
        : "radial-gradient(circle, rgba(204, 204, 204, 0) 0%, rgba(204, 204, 204, 0) 5%, rgba(0, 0, 0, 1) 100%)"
      };
    `;
    if (!isSerenity) {
      requestAnimationFrame(() => {
        overlay.classList.add("pulsing");
      });
    }

    body.classList.add("blackhole-" + state.phase);
  }

  return {
    isPurchased() {
      return state.purchased;
    },

    get phase() {
      return state.phase;
    },

    // Production is completely dead during absorption and the void.
    productionDisabled() {
      return state.purchased && (state.phase === "absorbing" || state.phase === "void");
    },

    // Nothing can be bought until serenity.
    buyingBlocked() {
      return state.purchased && state.phase !== "serenity";
    },

    goldenCookiesDisabled() {
      return state.purchased;
    },

    resetDisabled() {
      return state.purchased;
    },

    // null means: let the game compute it normally.
    cps() {
      if (!state.purchased) return null;
      if (state.phase === "absorbing" || state.phase === "void") return 0;
      return Infinity;
    },

    comment() {
      if (!state.purchased) return null;

      if (state.phase === "absorbing") {
        const index = Math.floor(state.absorbTicks / TICKS_PER_SECOND / 6) % ABSORBING_COMMENTS.length;
        return ABSORBING_COMMENTS[index];
      }

      if (state.phase === "void") return "Well&hellip;";

      if (state.phase === "infinity") {
        const index = Math.floor(state.phaseTicks / TICKS_PER_SECOND / 8) % RAMP_COMMENTS.length;
        return RAMP_COMMENTS[index];
      }

      if (state.phase === "serenity") {
        return "It's quiet. It's over. You are everything.";
      }

      return null;
    },

    purchaseAttempt() {
      if (state.purchased) return false;
      if (!isBoxCompleted()) return false;
      if (!Number.isFinite(cookies) || cookies <= 0) return false;

      state.targets = BUILDING_ORDER.map(name => buildings[name].count || 0);
      state.purchased = true;
      state.absorbTicks = 0;
      state.phaseTicks = 0;
      state.absorbedSoFar = 0;

      cookies = 0;
      buildings["Black Hole"].count = 1;

      silenceGoldenCookies();

      if (totalTargets() <= 0) {
        enterPhase("void");
      } else {
        state.phase = "absorbing";
        invalidateGainCache();
        syncDOM();
      }

      rebuildStore();
      saveGame();

      new Pop("credits", "The Black Hole has taken everything.");
      return true;
    },

    tick() {
      if (!state.purchased) return;

      if (state.phase === "absorbing") {
        state.absorbTicks++;
        this._tickAbsorbing();
      } else if (state.phase === "void") {
        state.phaseTicks++;
        if (state.phaseTicks >= VOID_DURATION_SECONDS * TICKS_PER_SECOND) {
          enterPhase("infinity");
        }
      } else if (state.phase === "infinity") {
        state.phaseTicks++;
        this._tickRamp();
      } else if (state.phase === "serenity") {
        state.phaseTicks++;
      }
    },

    _tickAbsorbing() {
      const total = totalTargets();
      if (total <= 0) {
        enterPhase("void");
        return;
      }

      const totalTicks = ABSORB_DURATION_SECONDS * TICKS_PER_SECOND;
      const idealAbsorbed = (state.absorbTicks / totalTicks) * total;

      while (state.absorbedSoFar < idealAbsorbed && state.absorbedSoFar < total) {
        for (const name of BUILDING_ORDER) {
          if (buildings[name].count > 0) {
            buildings[name].count--;
            state.absorbedSoFar++;
            break;
          }
        }
      }

      if (state.absorbedSoFar >= total) {
        BUILDING_ORDER.forEach(name => { buildings[name].count = 0; });
        enterPhase("void");
        return;
      }

      invalidateGainCache();

      // Update DOM counts every tick for smooth visual countdown
      BUILDING_ORDER.forEach(name => {
        const el = document.querySelector(`#buy${safeId(name)} .amount`);
        if (el) el.textContent = buildings[name].count;
      });

      if (ticks - state.storeUpdateTick >= TICKS_PER_SECOND) {
        state.storeUpdateTick = ticks;
        rebuildStore();
        refreshAllBuildingVisuals();
      }
    },

    _tickRamp() {
      const totalTicks = RAMP_DURATION_SECONDS * TICKS_PER_SECOND;
      const progress = Math.min(1, state.phaseTicks / totalTicks);

      if (progress >= 1) {
        enterPhase("serenity");
        cookies = Infinity;
        cookiesBakedAllTime = Infinity;
        prestige = calculatePrestige();
        invalidateGainCache();
        saveGame();
        new Pop("credits", "Infinity.");
        return;
      }

      // Cubic ease-in: slow at first, then unbearably fast.
      const eased = progress * progress * progress;
      const target = UVIGINTILLION * eased;

      if (target > cookies) {
        cookies = target;
        if (target > cookiesBakedAllTime) cookiesBakedAllTime = target;
      }
    },

    /* -------------------- Save / load -------------------- */

    saveData() {
      return {
        purchased: state.purchased,
        phase: state.phase,
        targets: state.targets,
        absorbTicks: state.absorbTicks,
        phaseTicks: state.phaseTicks,
        absorbedSoFar: state.absorbedSoFar
      };
    },

    resetData() {
      state.purchased = false;
      state.phase = "locked";
      state.targets = [];
      state.absorbTicks = 0;
      state.phaseTicks = 0;
      state.absorbedSoFar = 0;
      state.storeUpdateTick = -1000;
      return this.saveData();
    },

    loadData(data) {
      state.purchased = !!(data && data.purchased);
      state.phase = (data && data.phase) || "locked";
      state.targets = Array.isArray(data && data.targets) ? data.targets : [];
      state.absorbTicks = Number.isFinite(data && data.absorbTicks) ? data.absorbTicks : 0;
      state.phaseTicks = Number.isFinite(data && data.phaseTicks) ? data.phaseTicks : 0;
      state.absorbedSoFar = Number.isFinite(data && data.absorbedSoFar) ? data.absorbedSoFar : 0;
      state.storeUpdateTick = -1000;

      if (state.purchased) {
        if (state.phase === "serenity") {
          cookies = Infinity;
          cookiesBakedAllTime = Infinity;
          prestige = calculatePrestige();
        } else if (state.phase === "void" || state.phase === "infinity") {
          BUILDING_ORDER.forEach(name => { buildings[name].count = 0; });
        } else if (state.phase === "absorbing") {
          const total = totalTargets();
          let remaining = Math.floor(state.absorbedSoFar);
          BUILDING_ORDER.forEach((name, index) => {
            const absorbed = Math.min(state.targets[index] || 0, remaining);
            remaining -= absorbed;
            buildings[name].count = Math.max(0, (state.targets[index] || 0) - absorbed);
          });
        }
      }

      syncDOM();
      invalidateGainCache();
    },

    /* -------------------- Console helpers -------------------- */

    console: {
      purchase() {
        return BlackHole.purchaseAttempt();
      },

      // Jump straight to a phase for testing: "void", "infinity", "serenity"
      forcePhase(phase) {
        if (!state.purchased) {
          if (!isBoxCompleted()) return "The Box must be completed first";
          state.targets = BUILDING_ORDER.map(name => buildings[name].count || 0);
          state.purchased = true;
        }
        cookies = 0;
        buildings["Black Hole"].count = 1;
        enterPhase(phase);
        if (phase === "serenity") {
          cookies = Infinity;
          cookiesBakedAllTime = Infinity;
          prestige = calculatePrestige();
          invalidateGainCache();
        }
        saveGame();
        return "phase forced to: " + phase;
      },

      status() {
        return {
          purchased: state.purchased,
          phase: state.phase,
          targets: state.targets,
          absorbTicks: state.absorbTicks,
          phaseTicks: state.phaseTicks,
          absorbedSoFar: state.absorbedSoFar,
          totalTargets: totalTargets()
        };
      }
    }
  };
})();
window.BlackHole = BlackHole;
