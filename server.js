const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "673634078162";

const REGISTER_URL =
  "https://www.shreewin55.com/#/register?invitationCode=86286195967";

const HISTORY_URL =
  "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json";

const DATA_DIR = path.join(__dirname, "data");
const UID_FILE = path.join(DATA_DIR, "uids.json");

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false }));

// DATABASE
function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(UID_FILE)) {
    fs.writeFileSync(UID_FILE, "[]", "utf8");
  }
}

function readUIDs() {
  ensureDataFile();

  try {
    const data = fs.readFileSync(UID_FILE, "utf8");
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("UID read error:", e.message);
    return [];
  }
}

function writeUIDs(list) {
  ensureDataFile();

  fs.writeFileSync(
    UID_FILE,
    JSON.stringify(list, null, 2),
    "utf8"
  );
}

function cleanExpired(list) {
  const now = Date.now();

  return list.filter(item =>
    item &&
    item.uid &&
    Number(item.expiresAt) > now
  );
}

function saveCleanUIDs() {
  const list = cleanExpired(readUIDs());
  writeUIDs(list);
  return list;
}

function validUID(uid) {
  return /^\d{5,8}$/.test(
    String(uid || "")
  );
}

function validDeviceId(deviceId) {
  return (
    typeof deviceId === "string" &&
    deviceId.length >= 8 &&
    deviceId.length <= 200
  );
}

ensureDataFile();

// ADMIN TOKEN
const adminTokens = new Map();

function createAdminToken() {
  const token =
    crypto.randomBytes(32).toString("hex");

  adminTokens.set(token, {
    createdAt: Date.now()
  });

  return token;
}

function isAdminTokenValid(token) {
  if (
    !token ||
    !adminTokens.has(token)
  ) {
    return false;
  }

  const session =
    adminTokens.get(token);

  if (
    Date.now() -
    session.createdAt >
    12 * 60 * 60 * 1000
  ) {
    adminTokens.delete(token);
    return false;
  }

  return true;
}

function requireAdmin(req, res, next) {
  const auth =
    req.headers.authorization || "";

  if (!auth.startsWith("Bearer ")) {
    return res.status(401).json({
      ok: false,
      message: "Admin login required."
    });
  }

  const token = auth.slice(7);

  if (!isAdminTokenValid(token)) {
    return res.status(401).json({
      ok: false,
      message: "Admin session expired."
    });
  }

  next();
}

// BASIC API
app.get("/api/status", (req, res) => {
  res.json({
    ok: true,
    name: "AMBIKA PANE AI",
    serverTime: Date.now()
  });
});

app.get("/api/config", (req, res) => {
  res.json({
    ok: true,
    registerUrl: REGISTER_URL
  });
});
// ============================================================
// ADMIN LOGIN / LOGOUT
// ============================================================

app.post("/api/admin/login", (req, res) => {
  const password =
    String(req.body?.password || "");

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      ok: false,
      message: "Invalid admin password."
    });
  }

  const token = createAdminToken();

  res.json({
    ok: true,
    token,
    message: "Admin login successful."
  });
});

app.post(
  "/api/admin/logout",
  requireAdmin,
  (req, res) => {
    const token =
      (req.headers.authorization || "")
        .slice(7);

    adminTokens.delete(token);

    res.json({
      ok: true,
      message: "Logged out successfully."
    });
  }
);


// ============================================================
// ADMIN UID LIST
// ============================================================

app.get(
  "/api/admin/uids",
  requireAdmin,
  (req, res) => {
    const list = saveCleanUIDs();

    res.json({
      ok: true,
      count: list.length,
      uids: list
    });
  }
);


// ============================================================
// ACTIVATE UID
// ============================================================

app.post(
  "/api/admin/activate",
  requireAdmin,
  (req, res) => {

    const uid =
      String(req.body?.uid || "").trim();

    const hours =
      Number(req.body?.hours);

    if (!validUID(uid)) {
      return res.status(400).json({
        ok: false,
        message:
          "UID must contain 5 to 8 digits."
      });
    }

    if (hours !== 1 && hours !== 24) {
      return res.status(400).json({
        ok: false,
        message:
          "Duration must be 1 or 24 hours."
      });
    }

    let list =
      saveCleanUIDs();

    const old =
      list.find(
        x => x.uid === uid
      );

    if (old && old.deviceId) {
      return res.status(409).json({
        ok: false,
        message:
          "This UID is already active and bound to another device.",
        uid
      });
    }

    const now =
      Date.now();

    const record = {
      uid,
      deviceId: null,
      activatedAt: now,
      expiresAt:
        now +
        hours *
        60 *
        60 *
        1000,
      durationHours: hours
    };

    list =
      list.filter(
        x => x.uid !== uid
      );

    list.push(record);

    writeUIDs(list);

    res.json({
      ok: true,
      message:
        `UID activated for ${hours === 1 ? "1 hour" : "24 hours"}.`,
      record
    });
  }
);


// ============================================================
// LOCK SINGLE UID
// ============================================================

app.post(
  "/api/admin/lock",
  requireAdmin,
  (req, res) => {

    const uid =
      String(req.body?.uid || "").trim();

    if (!validUID(uid)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid UID."
      });
    }

    let list =
      saveCleanUIDs();

    const before =
      list.length;

    list =
      list.filter(
        x => x.uid !== uid
      );

    writeUIDs(list);

    res.json({
      ok: true,
      removed:
        list.length !== before,
      message:
        list.length !== before
          ? "UID locked successfully."
          : "UID was not found."
    });
  }
);


// ============================================================
// LOCK ALL UIDS
// ============================================================

app.post(
  "/api/admin/lock-all",
  requireAdmin,
  (req, res) => {

    writeUIDs([]);

    res.json({
      ok: true,
      message:
        "All UIDs locked successfully."
    });
  }
);


// ============================================================
// ACCESS CHECK
// ============================================================

app.post(
  "/api/access/check",
  (req, res) => {

    const uid =
      String(req.body?.uid || "").trim();

    const deviceId =
      String(req.body?.deviceId || "").trim();

    if (!validUID(uid)) {
      return res.status(400).json({
        ok: false,
        active: false,
        approved: false,
        message: "Invalid UID."
      });
    }

    if (!validDeviceId(deviceId)) {
      return res.status(400).json({
        ok: false,
        active: false,
        approved: false,
        message:
          "Invalid device ID."
      });
    }

    let list =
      saveCleanUIDs();

    const record =
      list.find(
        x => x.uid === uid
      );

    if (!record) {
      return res.json({
        ok: true,
        active: false,
        approved: false,
        message:
          "UID is not active."
      });
    }

    if (
      Number(record.expiresAt) <=
      Date.now()
    ) {

      writeUIDs(
        list.filter(
          x => x.uid !== uid
        )
      );

      return res.json({
        ok: true,
        active: false,
        approved: false,
        message:
          "UID access has expired."
      });
    }

    if (!record.deviceId) {

      record.deviceId =
        deviceId;

      writeUIDs(list);

      return res.json({
        ok: true,
        active: true,
        approved: true,
        claimed: true,
        uid: record.uid,
        expiresAt:
          record.expiresAt,
        message:
          "UID approved and device bound."
      });
    }

    if (
      record.deviceId ===
      deviceId
    ) {

      return res.json({
        ok: true,
        active: true,
        approved: true,
        claimed: false,
        uid: record.uid,
        expiresAt:
          record.expiresAt,
        message:
          "UID access approved."
      });
    }

    return res.status(403).json({
      ok: true,
      active: false,
      approved: false,
      deviceMismatch: true,
      message:
        "This UID is already bound to another device."
    });
  }
);
//
// ============================================================
// ACCESS STATUS
// ============================================================

app.post(
  "/api/access/status",
  (req, res) => {

    const uid =
      String(req.body?.uid || "").trim();

    const deviceId =
      String(req.body?.deviceId || "").trim();

    if (
      !validUID(uid) ||
      !validDeviceId(deviceId)
    ) {
      return res.json({
        ok: true,
        active: false
      });
    }

    const list =
      saveCleanUIDs();

    const record =
      list.find(
        x => x.uid === uid
      );

    if (
      !record ||
      Number(record.expiresAt) <=
      Date.now()
    ) {
      return res.json({
        ok: true,
        active: false
      });
    }

    if (
      record.deviceId &&
      record.deviceId !== deviceId
    ) {
      return res.json({
        ok: true,
        active: false
      });
    }

    res.json({
      ok: true,
      active: true,
      uid: record.uid,
      expiresAt: record.expiresAt
    });
  }
);


// ============================================================
// LIVE HISTORY CACHE
// ============================================================

let historyCache = null;
let historyCacheTime = 0;


// ============================================================
// FETCH LIVE HISTORY
// ============================================================

async function fetchLiveHistory() {

  const url =
    HISTORY_URL +
    (HISTORY_URL.includes("?")
      ? "&"
      : "?") +
    "_t=" +
    Date.now();

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      10000
    );

  try {

    const response =
      await fetch(
        url,
        {
          method: "GET",
          signal: controller.signal,

          headers: {
            "Accept":
              "application/json,text/plain,*/*",

            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",

            "Referer":
              "https://draw.ar-lottery01.com/"
          }
        }
      );

    if (!response.ok) {
      throw new Error(
        "History API HTTP " +
        response.status
      );
    }

    const text =
      await response.text();

    if (
      !text ||
      !text.trim()
    ) {
      throw new Error(
        "Empty history response."
      );
    }

    let data;

    try {

      data =
        JSON.parse(text);

    } catch (e) {

      throw new Error(
        "Invalid history JSON."
      );
    }

    if (!data) {
      throw new Error(
        "Invalid history data."
      );
    }

    // Save latest successful result
    historyCache = data;
    historyCacheTime =
      Date.now();

    return data;

  } finally {

    clearTimeout(timeout);
  }
}


// ============================================================
// HISTORY API
// ============================================================

app.get(
  "/api/history",
  async (req, res) => {

    try {

      const data =
        await fetchLiveHistory();

      return res.json(data);

    } catch (error) {

      console.error(
        "LIVE HISTORY ERROR:",
        error.message
      );

      // Last successful result
      if (historyCache) {

        return res.json({
          ...historyCache,
          cached: true,
          cacheTime:
            historyCacheTime
        });
      }

      // Safe response when upstream is unavailable
      return res.json({
        success: false,

        data: {
          list: []
        },

        message:
          "Live result connection temporarily unavailable."
      });
    }
  }
);


// ============================================================
// HEALTH CHECK
// ============================================================

app.get(
  "/health",
  (req, res) => {

    res.status(200).json({
      ok: true,
      status: "healthy",
      time:
        new Date().toISOString()
    });
  }
);
// ============================================================
// STATIC FRONTEND
// ============================================================

const publicDir =
  path.join(__dirname, "public");

app.use(
  express.static(publicDir, {
    extensions: ["html"]
  })
);


// ============================================================
// EXPRESS 5 FRONTEND FALLBACK
// ============================================================

app.use(
  (req, res, next) => {

    // API requests should remain API requests
    if (
      req.path.startsWith("/api/")
    ) {
      return next();
    }

    if (
      req.path === "/health"
    ) {
      return next();
    }

    const indexFile =
      path.join(
        publicDir,
        "index.html"
      );

    if (
      fs.existsSync(indexFile)
    ) {
      return res.sendFile(
        indexFile
      );
    }

    next();
  }
);


// ============================================================
// 404 HANDLER
// ============================================================

app.use(
  (req, res) => {

    if (
      req.path.startsWith("/api/")
    ) {
      return res.status(404).json({
        ok: false,
        message:
          "API endpoint not found."
      });
    }

    res.status(404).send(
      "Page not found."
    );
  }
);


// ============================================================
// ERROR HANDLER
// ============================================================

app.use(
  (err, req, res, next) => {

    console.error(
      "SERVER ERROR:",
      err
    );

    if (res.headersSent) {
      return next(err);
    }

    res.status(500).json({
      ok: false,
      message:
        "Internal server error."
    });
  }
);


// ============================================================
// START SERVER
// ============================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      "=============================================="
    );

    console.log(
      " AMBIKA PANE AI SERVER STARTED"
    );

    console.log(
      " PORT:",
      PORT
    );

    console.log(
      " HISTORY PROXY: ENABLED"
    );

    console.log(
      " UID SYSTEM: ENABLED"
    );

    console.log(
      " ADMIN SYSTEM: ENABLED"
    );

    console.log(
      "=============================================="
    );
  }
);