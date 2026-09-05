/* =========================================================
   AMBIKA PANE AI — app.js
   PART 1 / 3
   ========================================================= */

const REGISTER_URL =
  "https://www.shreewin55.com/#/register?invitationCode=86286195967";

const FIRST_VOICE_URL =
  "https://www.image2url.com/r2/default/audio/1788601237629-ae72506e-6dd9-4f75-8c03-b0383f16e698.mp3";

const SECOND_VOICE_URL =
  "https://www.image2url.com/r2/default/audio/1788602798484-4fe76aab-b340-451d-aa47-eb2c157e4ea4.mp3";

const NUMBER_IMAGES = {
  0: "https://dynamic-indigo-glkg7p1j.edgeone.dev/0.png",
  1: "https://dynamic-indigo-glkg7p1j.edgeone.dev/1.png",
  2: "https://dynamic-indigo-glkg7p1j.edgeone.dev/2.png",
  3: "https://dynamic-indigo-glkg7p1j.edgeone.dev/3.png",
  4: "https://dynamic-indigo-glkg7p1j.edgeone.dev/4.png",
  5: "https://dynamic-indigo-glkg7p1j.edgeone.dev/5.png",
  6: "https://dynamic-indigo-glkg7p1j.edgeone.dev/6.png",
  7: "https://dynamic-indigo-glkg7p1j.edgeone.dev/7.png",
  8: "https://dynamic-indigo-glkg7p1j.edgeone.dev/8.png",
  9: "https://dynamic-indigo-glkg7p1j.edgeone.dev/9%20%281%29.png"
};

const firstVoice = new Audio(FIRST_VOICE_URL);
const secondVoice = new Audio(SECOND_VOICE_URL);

firstVoice.preload = "auto";
secondVoice.preload = "auto";

let currentPeriod = "";
let seconds = 60;
let redirectTimer = null;
let currentUID = "";

/* =========================================================
   DEVICE ID
   ========================================================= */

const DEVICE_KEY = "ambika_panel_device_v2";

function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);

    if (!id) {
      if (
        window.crypto &&
        typeof crypto.randomUUID === "function"
      ) {
        id = crypto.randomUUID();
      } else {
        id =
          Date.now().toString(36) +
          "-" +
          Math.random().toString(36).slice(2) +
          "-" +
          Math.random().toString(36).slice(2);
      }

      localStorage.setItem(DEVICE_KEY, id);
    }

    return id;
  } catch (error) {
    return (
      "device-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2)
    );
  }
}

const deviceId = getDeviceId();

/* =========================================================
   DOM HELPERS
   ========================================================= */

const $ = (id) =>
  document.getElementById(id);

function safeText(id, value) {
  const el = $(id);
  if (el) {
    el.textContent = value;
  }
}

function pick(obj, keys) {
  for (const key of keys) {
    if (
      obj &&
      obj[key] !== undefined &&
      obj[key] !== null &&
      obj[key] !== ""
    ) {
      return obj[key];
    }
  }

  return "";
}

function getList(json) {
  return (
    json?.data?.list ||
    json?.data?.records ||
    json?.list ||
    json?.records ||
    []
  );
}

/* =========================================================
   LOADING SCREEN
   ========================================================= */

const loadingScreen =
  $("loadingScreen");

const app =
  $("app");

const bar =
  $("progressBar");

const percent =
  $("percent");

const loadingStatus =
  $("loadingStatus");

const loadingMessages = [
  "Initializing secure interface...",
  "Connecting AI engine...",
  "Synchronizing game server...",
  "Loading live database...",
  "Preparing dashboard...",
  "System ready..."
];

function startLoading() {
  if (!loadingScreen || !app) {
    return;
  }

  const started =
    performance.now();

  function loop(now) {
    const progress =
      Math.min(
        100,
        Math.floor(
          ((now - started) / 3000) *
            100
        )
      );

    if (bar) {
      bar.style.width =
        progress + "%";
    }

    if (percent) {
      percent.textContent =
        progress + "%";
    }

    if (loadingStatus) {
      const index =
        Math.min(
          loadingMessages.length - 1,
          Math.floor(progress / 18)
        );

      loadingStatus.textContent =
        loadingMessages[index];
    }

    if (progress < 100) {
      requestAnimationFrame(loop);
    } else {
      setTimeout(() => {
        loadingScreen.classList.add(
          "hide"
        );

        app.style.display =
          "block";
      }, 150);
    }
  }

  requestAnimationFrame(loop);
}

/* =========================================================
   AUDIO
   ========================================================= */

function playFirstVoice() {
  try {
    firstVoice.pause();
    firstVoice.currentTime = 0;

    const promise =
      firstVoice.play();

    if (
      promise &&
      typeof promise.catch ===
        "function"
    ) {
      promise.catch(() => {});
    }
  } catch (error) {}
}

function playSecondVoice() {
  try {
    secondVoice.pause();
    secondVoice.currentTime = 0;

    const promise =
      secondVoice.play();

    if (
      promise &&
      typeof promise.catch ===
        "function"
    ) {
      promise.catch(() => {});
    }
  } catch (error) {}
}

/* =========================================================
   LIVE HISTORY
   ========================================================= */

async function loadResults() {
  const box =
    $("resultList");

  if (!box) {
    return;
  }

  try {
    const response =
      await fetch(
        "/api/history?ts=" +
          Date.now(),
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept:
              "application/json"
          }
        }
      );

    if (!response.ok) {
      throw new Error(
        "History request failed"
      );
    }

    const json =
      await response.json();

    const list =
      getList(json);

    if (
      !Array.isArray(list) ||
      !list.length
    ) {
      throw new Error(
        "Empty history"
      );
    }

    renderResults(list);
    updatePeriod(list);
    updatePattern(list);
  } catch (error) {
    console.error(
      "History error:",
      error
    );

    box.innerHTML = `
      <div class="resultError">
        Live result connection unavailable.<br>
        Please refresh or check the server.
      </div>
    `;
  }
}

/* =========================================================
   RESULT RENDER
   ========================================================= */

function renderResults(list) {
  const box =
    $("resultList");

  if (!box) {
    return;
  }

  box.innerHTML =
    list
      .slice(0, 20)
      .map(
        (item, index) => {
          const issue =
            pick(item, [
              "issueNumber",
              "issue",
              "period",
              "issueNo"
            ]);

          const number =
            Number(
              pick(item, [
                "number",
                "openNumber",
                "result",
                "resultNumber",
                "winNumber"
              ])
            );

          const valid =
            Number.isInteger(
              number
            ) &&
            number >= 0 &&
            number <= 9;

          const size =
            valid
              ? number >= 5
                ? "BIG"
                : "SMALL"
              : "--";

          const status =
            index % 3 === 2
              ? "LOSS"
              : "WIN";

          const image =
            valid
              ? NUMBER_IMAGES[number]
              : "";

          return `
            <div class="resultRow">

              <div class="resultIssue">
                <span
                  style="
                    display:block;
                    color:#4f7780;
                    font-size:8px;
                    letter-spacing:1px;
                    margin-bottom:4px
                  "
                >
                  PERIOD
                </span>
                ${issue || "Round " + (index + 1)}
              </div>

              <div class="resultNumber">
                ${
                  valid
                    ? `
                      <img
                        src="${image}"
                        alt="${number}"
                        onerror="
                          this.style.display='none';
                          this.parentElement.innerHTML=
                          '<span class=resultNumberFallback>${number}</span>'
                        "
                      >
                    `
                    : `
                      <span class="resultNumberFallback">
                        --
                      </span>
                    `
                }
              </div>

              <div
                class="
                  resultSize
                  ${
                    size === "BIG"
                      ? "resultBig"
                      : "resultSmall"
                  }
                "
              >
                ${size}
              </div>

              <div
                class="
                  resultStatus
                  ${
                    status === "LOSS"
                      ? "loss"
                      : ""
                  }
                "
              >
                ${status}
              </div>

            </div>
          `;
        }
      )
      .join("");
}

/* =========================================================
   PERIOD
   ========================================================= */

function updatePeriod(list) {
  const raw =
    pick(
      list[0] || {},
      [
        "issueNumber",
        "issue",
        "period",
        "issueNo"
      ]
    );

  const digits =
    String(raw || "")
      .replace(/\D/g, "");

  if (digits.length >= 10) {
    try {
      currentPeriod =
        (
          BigInt(digits) +
          1n
        ).toString();
    } catch (error) {
      currentPeriod =
        digits;
    }
  } else if (
    !currentPeriod
  ) {
    currentPeriod =
      String(raw || "");
  }

  safeText(
    "period",
    currentPeriod ||
      "SYNCING..."
  );
}

/* =========================================================
   PATTERN
   ========================================================= */

function updatePattern(list) {
  const numbers =
    list
      .slice(0, 10)
      .map((item) =>
        Number(
          pick(item, [
            "number",
            "openNumber",
            "result",
            "resultNumber",
            "winNumber"
          ])
        )
      )
      .filter(
        (number) =>
          Number.isFinite(number) &&
          number >= 0 &&
          number <= 9
      );

  if (!numbers.length) {
    return;
  }

  const big =
    numbers.filter(
      (number) =>
        number >= 5
    ).length;

  const bigPercent =
    Math.round(
      (big /
        numbers.length) *
        100
    );

  const smallPercent =
    100 - bigPercent;

  safeText(
    "patternValue",
    `BIG ${bigPercent}% | SMALL ${smallPercent}%`
  );

  const fill =
    $("patternFill");

  if (fill) {
    fill.style.width =
      "100%";

    fill.style.background =
      `linear-gradient(
        90deg,
        #ffd75a 0 ${bigPercent}%,
        #64e8ff ${bigPercent}% 100%
      )`;
  }
}

/* =========================================================
   COUNTDOWN
   ========================================================= */

function syncCountdown() {
  const now =
    new Date();

  const currentSecond =
    now.getSeconds();

  seconds =
    currentSecond === 0
      ? 60
      : 60 - currentSecond;

  safeText(
    "timerText",
    "00:" +
      String(seconds)
        .padStart(2, "0")
  );
}

/* =========================================================
   DEMO DISPLAY VALUES
   ========================================================= */

function randomInt(
  min,
  max
) {
  return (
    Math.floor(
      Math.random() *
        (max - min + 1)
    ) + min
  );
}

function updateLiveDemoValues() {
  safeText(
    "liveUid",
    randomInt(
      10000,
      1000000
    ).toLocaleString(
      "en-IN"
    )
  );

  safeText(
    "liveWin",
    randomInt(
      20000,
      1000000
    ).toLocaleString(
      "en-IN"
    )
  );
}
// ===============================
// AMBIKA PANE AI — APP.JS
// PART 2 / 3
// ===============================

function getSavedUID() {
    return localStorage.getItem("ambika_last_uid") || "";
}

function saveUID(uid) {
    localStorage.setItem("ambika_last_uid", String(uid));
}

function clearSavedUID() {
    localStorage.removeItem("ambika_last_uid");
}

async function apiJSON(url, options = {}) {
    try {
        const response = await fetch(url, {
            cache: "no-store",
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        const data = await response.json().catch(() => ({}));

        return {
            ok: response.ok,
            status: response.status,
            data
        };
    } catch (error) {
        console.error("API Error:", error);

        return {
            ok: false,
            status: 0,
            data: {
                error: "Server connection failed"
            }
        };
    }
}


// ===============================
// UID MODAL
// ===============================

function openUnlock() {
    const modal = $("unlockModal");

    if (!modal) return;

    modal.style.display = "flex";

    setTimeout(() => {
        const input = $("uidInput");
        if (input) {
            input.focus();
            input.select();
        }
    }, 100);
}


function closeUnlock() {
    const modal = $("unlockModal");

    if (modal) {
        modal.style.display = "none";
    }
}


function showUIDMessage(message, type = "info") {
    const box =
        $("uidMessage") ||
        $("unlockMessage") ||
        $("uidStatus");

    if (!box) {
        alert(message);
        return;
    }

    box.textContent = message;

    box.className = box.className
        .replace(/\b(success|error|info|warning)\b/g, "")
        .trim();

    box.classList.add(type);
    box.style.display = "block";
}


// ===============================
// ACTIVE ACCESS PANEL
// ===============================

function showActiveAccess(uid, accessData) {
    currentUID = String(uid);

    saveUID(currentUID);

    const active =
        accessData?.active === true ||
        accessData?.status === "active";

    if (!active) {
        showInactiveAccess();
        return;
    }

    closeUnlock();

    const unlockButton =
        $("unlockBtn") ||
        $("unlockButton") ||
        $("unlockHack");

    if (unlockButton) {
        unlockButton.style.display = "none";
    }

    const activePanel =
        $("activePanel") ||
        $("accessPanel") ||
        $("predictionPanel");

    if (activePanel) {
        activePanel.style.display = "";
    }

    refreshPrediction();

    updateAccessUI(true, uid, accessData);
}


function showInactiveAccess() {
    const uid = currentUID || getSavedUID();

    updateAccessUI(false, uid, null);

    playSecondVoice();

    showUIDMessage(
        "UID is not active / approved. Please contact admin.",
        "error"
    );

    startRedirectCountdown();
}


function updateAccessUI(active, uid, data) {
    const statusElements = [
        $("accessStatus"),
        $("uidStatus"),
        $("unlockStatus")
    ];

    statusElements.forEach(el => {
        if (!el) return;

        el.textContent = active
            ? `ACCESS ACTIVE • UID ${uid}`
            : `ACCESS LOCKED • UID ${uid || "—"}`;

        el.classList.toggle("active", active);
        el.classList.toggle("locked", !active);
    });

    const expiry =
        data?.expiresAt ||
        data?.expiry ||
        data?.expires_at;

    const expiryEl =
        $("accessExpiry") ||
        $("uidExpiry");

    if (expiryEl) {
        if (expiry) {
            const date = new Date(expiry);

            expiryEl.textContent =
                `Expires: ${isNaN(date.getTime())
                    ? expiry
                    : date.toLocaleString()}`;
        } else {
            expiryEl.textContent = "";
        }
    }
}


// ===============================
// VERIFY UID
// ===============================

async function verifyUID() {
    const input = $("uidInput");

    if (!input) return;

    const uid = input.value.trim();

    if (!/^\d{5,8}$/.test(uid)) {
        showUIDMessage(
            "Game UID must contain 5–8 digits.",
            "error"
        );
        return;
    }

    const verifyButton =
        $("verifyUidBtn") ||
        $("verifyUID") ||
        $("uidVerifyBtn");

    if (verifyButton) {
        verifyButton.disabled = true;
        verifyButton.dataset.oldText =
            verifyButton.textContent;

        verifyButton.textContent = "CHECKING...";
    }

    try {
        const result = await apiJSON("/api/access/check", {
            method: "POST",
            body: JSON.stringify({
                uid: uid,
                deviceId: deviceId
            })
        });

        if (!result.ok) {
            const message =
                result.data?.error ||
                result.data?.message ||
                "UID verification failed.";

            showUIDMessage(message, "error");

            playSecondVoice();
            startRedirectCountdown();

            return;
        }

        const data = result.data || {};

        if (
            data.active === true ||
            data.status === "active"
        ) {
            playFirstVoice();

            showActiveAccess(uid, data);

            return;
        }

        clearSavedUID();

        currentUID = uid;

        showInactiveAccess();

    } finally {
        if (verifyButton) {
            verifyButton.disabled = false;

            verifyButton.textContent =
                verifyButton.dataset.oldText ||
                "UNLOCK";
        }
    }
}


// ===============================
// AUTO CHECK SAVED UID
// ===============================

async function restoreAccess() {
    const uid = getSavedUID();

    if (!uid) return;

    if (!/^\d{5,8}$/.test(uid)) {
        clearSavedUID();
        return;
    }

    const result = await apiJSON("/api/access/status", {
        method: "POST",
        body: JSON.stringify({
            uid: uid,
            deviceId: deviceId
        })
    });

    if (!result.ok) {
        return;
    }

    const data = result.data || {};

    if (
        data.active === true ||
        data.status === "active"
    ) {
        currentUID = uid;

        showActiveAccess(uid, data);
    } else {
        clearSavedUID();
    }
}


// ===============================
// REDIRECT COUNTDOWN
// ===============================

function startRedirectCountdown() {
    if (redirectTimer) {
        clearInterval(redirectTimer);
        redirectTimer = null;
    }

    let count = 7;

    const updateText = () => {
        const elements = [
            $("redirectTimer"),
            $("countdownRedirect"),
            $("redirectCount")
        ];

        elements.forEach(el => {
            if (!el) return;

            el.textContent =
                `Redirecting in ${count}s...`;
        });
    };

    updateText();

    redirectTimer = setInterval(() => {
        count--;

        updateText();

        if (count <= 0) {
            clearInterval(redirectTimer);
            redirectTimer = null;

            window.location.href = REGISTER_URL;
        }
    }, 1000);
}


// ===============================
// PREDICTION DEMO
// ===============================

function getPredictionSeed(uid, minuteKey) {
    let hash = 0;

    const value =
        String(uid || "0") +
        ":" +
        String(minuteKey);

    for (let i = 0; i < value.length; i++) {
        hash =
            ((hash << 5) - hash) +
            value.charCodeAt(i);

        hash |= 0;
    }

    return Math.abs(hash);
}


function generatePrediction(uid) {
    const now = new Date();

    const minuteKey =
        Math.floor(now.getTime() / 60000);

    const seed =
        getPredictionSeed(uid || "0", minuteKey);

    const number =
        seed % 10;

    const size =
        number >= 5
            ? "BIG"
            : "SMALL";

    const parity =
        number % 2 === 0
            ? "EVEN"
            : "ODD";

    return {
        number,
        size,
        parity,
        minuteKey
    };
}


function setPredictionNumber(number) {
    const image =
        $("predictionNumberImage") ||
        $("predNumberImage") ||
        $("predictionImg");

    if (image) {
        image.src =
            NUMBER_IMAGES[number] ||
            NUMBER_IMAGES[0];

        image.alt =
            `Prediction ${number}`;
    }

    const numberText =
        $("predictionNumber") ||
        $("predNumber");

    if (numberText) {
        numberText.textContent = number;
    }
}


function setPredictionSize(size) {
    const elements = [
        $("predictionSize"),
        $("predSize"),
        $("bigSmallPrediction")
    ];

    elements.forEach(el => {
        if (!el) return;

        el.textContent = size;

        el.classList.remove(
            "big",
            "small"
        );

        el.classList.add(
            size.toLowerCase()
        );
    });
}


function setPredictionParity(parity) {
    const el =
        $("predictionParity") ||
        $("predParity");

    if (!el) return;

    el.textContent = parity;
}


function refreshPrediction() {
    const uid =
        currentUID ||
        getSavedUID();

    if (!uid) {
        return;
    }

    const prediction =
        generatePrediction(uid);

    setPredictionNumber(
        prediction.number
    );

    setPredictionSize(
        prediction.size
    );

    setPredictionParity(
        prediction.parity
    );

    const periodEl =
        $("predictionPeriod") ||
        $("predPeriod");

    if (periodEl && currentPeriod) {
        periodEl.textContent =
            currentPeriod;
    }

    const label =
        $("predictionLabel");

    if (label) {
        label.textContent =
            "DEMO PREDICTION";
    }

    return prediction;
}


// ===============================
// UPDATE PREDICTION EVERY MINUTE
// ===============================

let lastPredictionMinute = null;

function predictionLoop() {
    const uid =
        currentUID ||
        getSavedUID();

    if (!uid) return;

    const minute =
        Math.floor(
            Date.now() / 60000
        );

    if (
        lastPredictionMinute !== minute
    ) {
        lastPredictionMinute = minute;

        refreshPrediction();
    }
}


// ===============================
// UNLOCK BUTTON EVENTS
// ===============================

function setupUnlockEvents() {
    const openButtons = [
        $("unlockBtn"),
        $("unlockButton"),
        $("unlockHack")
    ].filter(Boolean);

    openButtons.forEach(button => {
        button.addEventListener(
            "click",
            openUnlock
        );
    });

    const closeButtons = [
        $("unlockClose"),
        $("closeUnlock"),
        $("modalClose")
    ].filter(Boolean);

    closeButtons.forEach(button => {
        button.addEventListener(
            "click",
            closeUnlock
        );
    });

    const verifyButtons = [
        $("verifyUidBtn"),
        $("verifyUID"),
        $("uidVerifyBtn")
    ].filter(Boolean);

    verifyButtons.forEach(button => {
        button.addEventListener(
            "click",
            verifyUID
        );
    });

    const input = $("uidInput");

    if (input) {
        input.addEventListener(
            "input",
            () => {
                input.value =
                    input.value
                        .replace(/\D/g, "")
                        .slice(0, 8);
            }
        );

        input.addEventListener(
            "keydown",
            event => {
                if (event.key === "Enter") {
                    verifyUID();
                }
            }
        );
    }
}


// ===============================
// MODAL OUTSIDE CLICK
// ===============================

function setupModalOutsideClick() {
    const modal = $("unlockModal");

    if (!modal) return;

    modal.addEventListener(
        "click",
        event => {
            if (event.target === modal) {
                closeUnlock();
            }
        }
    );
}


// ===============================
// SOUND BUTTON
// ===============================

function setupSoundButton() {
    const buttons = [
        $("soundBtn"),
        $("soundButton"),
        $("audioBtn")
    ].filter(Boolean);

    buttons.forEach(button => {
        button.addEventListener(
            "click",
            () => {
                playFirstVoice();

                button.classList.toggle(
                    "sound-active"
                );
            }
        );
    });
}


// ===============================
// MAIN APP START
// ===============================

async function startApp() {
    setupUnlockEvents();
    setupModalOutsideClick();
    setupSoundButton();

    await loadResults();
    await restoreAccess();

    updatePeriod();
    updatePattern();
    refreshPrediction();

    setInterval(() => {
        loadResults();
    }, 15000);

    setInterval(() => {
        updatePeriod();
        syncCountdown();
        predictionLoop();
    }, 1000);
}


// ===============================
// DOM READY
// ===============================

if (
    document.readyState === "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        startApp
    );
} else {
    startApp();
}
// ===============================
// AMBIKA PANE AI — APP.JS
// PART 3 / 3
// ===============================


// ===============================
// LIVE UI HELPERS
// ===============================

function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
}


function showElement(id, display = "") {
    const el = $(id);
    if (el) el.style.display = display;
}


function hideElement(id) {
    const el = $(id);
    if (el) el.style.display = "none";
}


// ===============================
// PERIOD / COUNTDOWN UI
// ===============================

function updateLivePeriodUI() {
    if (!currentPeriod) return;

    const periodElements = [
        $("period"),
        $("periodNumber"),
        $("currentPeriod"),
        $("targetPeriod")
    ].filter(Boolean);

    periodElements.forEach(el => {
        el.textContent = currentPeriod;
    });

    const predictionPeriod =
        $("predictionPeriod") ||
        $("predPeriod");

    if (predictionPeriod) {
        predictionPeriod.textContent =
            currentPeriod;
    }
}


function updateCountdownUI() {
    const value = Math.max(
        0,
        Number(seconds) || 0
    );

    const formatted =
        String(value).padStart(2, "0");

    const elements = [
        $("countdown"),
        $("timer"),
        $("seconds"),
        $("countdownSeconds")
    ].filter(Boolean);

    elements.forEach(el => {
        el.textContent = formatted;
    });

    const circle =
        $("countdownCircle");

    if (circle) {
        const progress =
            Math.min(100, value * 100 / 60);

        circle.style.setProperty(
            "--progress",
            `${progress}%`
        );
    }
}


// ===============================
// PREDICTION VISUAL EFFECT
// ===============================

function animatePrediction() {
    const elements = [
        $("predictionCard"),
        $("predictionPanel"),
        $("predictionNumberImage"),
        $("predNumberImage")
    ].filter(Boolean);

    elements.forEach(el => {
        el.classList.remove(
            "predictionPulse"
        );

        void el.offsetWidth;

        el.classList.add(
            "predictionPulse"
        );
    });
}


const originalRefreshPrediction =
    refreshPrediction;

refreshPrediction = function () {
    const result =
        originalRefreshPrediction();

    animatePrediction();

    return result;
};


// ===============================
// PAGE NAVIGATION
// ===============================

function setupNavigation() {
    const homeButtons = [
        $("homeBtn"),
        $("homeButton")
    ].filter(Boolean);

    homeButtons.forEach(button => {
        button.addEventListener(
            "click",
            () => {
                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }
        );
    });

    const registerButtons = [
        $("registerBtn"),
        $("registerButton"),
        $("joinBtn"),
        $("joinNow")
    ].filter(Boolean);

    registerButtons.forEach(button => {
        button.addEventListener(
            "click",
            () => {
                window.location.href =
                    REGISTER_URL;
            }
        );
    });
}


// ===============================
// VISIBILITY / REFRESH CHECK
// ===============================

function setupVisibilityRefresh() {
    document.addEventListener(
        "visibilitychange",
        async () => {
            if (
                document.visibilityState ===
                "visible"
            ) {
                await loadResults();

                const uid =
                    currentUID ||
                    getSavedUID();

                if (uid) {
                    await restoreAccess();
                }

                refreshPrediction();
            }
        }
    );
}


// ===============================
// SERVER STATUS
// ===============================

async function checkServerStatus() {
    const result =
        await apiJSON("/api/status");

    const indicator =
        $("serverStatus") ||
        $("connectionStatus");

    if (!indicator) return;

    if (result.ok) {
        indicator.textContent =
            "SERVER ONLINE";

        indicator.classList.add(
            "online"
        );

        indicator.classList.remove(
            "offline"
        );
    } else {
        indicator.textContent =
            "SERVER OFFLINE";

        indicator.classList.add(
            "offline"
        );

        indicator.classList.remove(
            "online"
        );
    }
}


// ===============================
// PERIOD CHANGE WATCHER
// ===============================

let lastKnownPeriod = null;

function watchPeriodChange() {
    if (!currentPeriod) return;

    if (
        lastKnownPeriod !== null &&
        lastKnownPeriod !== currentPeriod
    ) {
        const uid =
            currentUID ||
            getSavedUID();

        if (uid) {
            refreshPrediction();
        }
    }

    lastKnownPeriod =
        currentPeriod;
}


// ===============================
// SAFE HISTORY REFRESH
// ===============================

async function historyLoop() {
    try {
        await loadResults();

        updateLivePeriodUI();
        updateCountdownUI();
        watchPeriodChange();

    } catch (error) {
        console.error(
            "History refresh error:",
            error
        );
    }
}


// ===============================
// APP HEARTBEAT
// ===============================

function appHeartbeat() {
    updateLivePeriodUI();
    updateCountdownUI();

    const uid =
        currentUID ||
        getSavedUID();

    if (uid) {
        predictionLoop();
    }
}


// ===============================
// START EXTRA LOOPS
// ===============================

function startExtraLoops() {
    setInterval(
        historyLoop,
        15000
    );

    setInterval(
        appHeartbeat,
        1000
    );

    setInterval(
        checkServerStatus,
        30000
    );
}


// ===============================
// INIT EXTRA FEATURES
// ===============================

function initializeExtraFeatures() {
    setupNavigation();
    setupVisibilityRefresh();
    checkServerStatus();
    startExtraLoops();
}


// ===============================
// RUN AFTER MAIN APP
// ===============================

if (
    document.readyState === "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeExtraFeatures,
        { once: true }
    );
} else {
    initializeExtraFeatures();
}


// ===============================
// GLOBAL FUNCTIONS
// ===============================

window.AMBIKA = {
    openUnlock,
    closeUnlock,
    verifyUID,
    refreshPrediction,
    loadResults,
    restoreAccess,
    clearSavedUID,
    getSavedUID,
    checkServerStatus
};


// ===============================
// PREVENT ACCIDENTAL FORM SUBMIT
// ===============================

document.addEventListener(
    "submit",
    event => {
        const form =
            event.target;

        if (
            form &&
            form.id === "uidForm"
        ) {
            event.preventDefault();

            verifyUID();
        }
    }
);


// ===============================
// ESC KEY
// ===============================

document.addEventListener(
    "keydown",
    event => {
        if (event.key !== "Escape") {
            return;
        }

        const modal =
            $("unlockModal");

        if (
            modal &&
            modal.style.display !== "none"
        ) {
            closeUnlock();
        }
    }
);


// ===============================
// ONLINE / OFFLINE
// ===============================

window.addEventListener(
    "online",
    () => {
        checkServerStatus();
        loadResults();
    }
);


window.addEventListener(
    "offline",
    () => {
        const indicator =
            $("serverStatus") ||
            $("connectionStatus");

        if (indicator) {
            indicator.textContent =
                "OFFLINE";

            indicator.classList.add(
                "offline"
            );
        }
    }
);


// ===============================
// FINAL READY MARKER
// ===============================

window.__AMBIKA_APP_READY__ = true;

console.log(
    "%c AMBIKA PANE AI ",
    "font-weight:bold;font-size:16px"
);

console.log(
    "App.js loaded successfully."
);