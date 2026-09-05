// ============================================================
// AMBIKA PANE AI - SERVER
// PART 1 / BACKEND
// ============================================================

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// ------------------------------------------------------------
// CONFIG
// ------------------------------------------------------------

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "673634078162";

const REGISTER_URL =
  "https://www.shreewin55.com/#/register?invitationCode=86286195967";

const HISTORY_URL =
  "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json";

const DATA_DIR = path.join(__dirname, "data");
const UID_FILE = path.join(DATA_DIR, "uids.json");

// ------------------------------------------------------------
// MIDDLEWARE
// ------------------------------------------------------------

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false }));

// ------------------------------------------------------------
// DATA FILE
// ------------------------------------------------------------

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(UID_FILE)) {
    fs.writeFileSync(
      UID_FILE,
      JSON.stringify([], null, 2),
      "utf8"
    );
  }
}

ensureDataFile();

function readUIDs() {
  try {
    const data = fs.readFileSync(UID_FILE, "utf8");
    const parsed = JSON.parse(data);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("UID database read error:", error);
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

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function validUID(uid) {
  return /^\d{5,8}$/.test(String(uid || ""));
}

function validDeviceId(deviceId) {
  return (
    typeof deviceId === "string" &&
    deviceId.length >= 8 &&
    deviceId.length <= 200
  );
}

function cleanExpired(list) {
  const now = Date.now();

  return list.filter((item) => {
    if (!item.expiresAt) return false;
    return Number(item.expiresAt) > now;
  });
}

function saveCleanUIDs() {
  const list = cleanExpired(readUIDs());

  writeUIDs(list);

  return list;
}

// ------------------------------------------------------------
// ADMIN AUTH
// ------------------------------------------------------------

const adminTokens = new Map();

function createAdminToken() {
  const token = crypto.randomBytes(32).toString("hex");

  adminTokens.set(token, {
    createdAt: Date.now(),
  });

  return token;
}

function isAdminTokenValid(token) {
  if (!token || !adminTokens.has(token)) {
    return false;
  }

  const session = adminTokens.get(token);

  // Admin session expires after 12 hours
  if (Date.now() - session.createdAt > 12 * 60 * 60 * 1000) {
    adminTokens.delete(token);
    return false;
  }

  return true;
}

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";

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

// ------------------------------------------------------------
// BASIC ROUTE
// ------------------------------------------------------------

app.get("/api/status", (req, res) => {
  res.json({
    ok: true,
    name: "AMBIKA PANE AI",
    serverTime: Date.now()
  });
});

// ------------------------------------------------------------
// REGISTER INFO
// ------------------------------------------------------------

app.get("/api/config", (req, res) => {
  res.json({
    ok: true,
    registerUrl: REGISTER_URL
  });
});

// ------------------------------------------------------------
// ADMIN LOGIN
// ------------------------------------------------------------

app.post("/api/admin/login", (req, res) => {
  const password = String(req.body.password || "");

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      ok: false,
      message: "Wrong admin password."
    });
  }

  const token = createAdminToken();

  res.json({
    ok: true,
    token,
    message: "Admin login successful."
  });
});

// ------------------------------------------------------------
// ADMIN LOGOUT
// ------------------------------------------------------------

app.post("/api/admin/logout", requireAdmin, (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.slice(7);

  adminTokens.delete(token);

  res.json({
    ok: true,
    message: "Logged out."
  });
});

// ------------------------------------------------------------
// ADMIN - GET ALL UID RECORDS
// ------------------------------------------------------------

app.get("/api/admin/uids", requireAdmin, (req, res) => {
  const list = saveCleanUIDs();

  res.json({
    ok: true,
    count: list.length,
    uids: list
  });
});

// ------------------------------------------------------------
// ADMIN - ACTIVATE UID
// ------------------------------------------------------------

app.post("/api/admin/activate", requireAdmin, (req, res) => {
  const uid = String(req.body.uid || "").trim();
  const hours = Number(req.body.hours);

  if (!validUID(uid)) {
    return res.status(400).json({
      ok: false,
      message: "UID must contain 5–8 digits."
    });
  }

  if (![1, 24].includes(hours)) {
    return res.status(400).json({
      ok: false,
      message: "Duration must be 1 hour or 1 day."
    });
  }

  let list = saveCleanUIDs();

  const now = Date.now();
  const expiresAt = now + hours * 60 * 60 * 1000;

  const existingIndex = list.findIndex(
    (item) => item.uid === uid
  );

  const existing = existingIndex >= 0
    ? list[existingIndex]
    : null;

  // If UID already belongs to another device
  // and is still active, don't silently move it.
  if (
    existing &&
    existing.deviceId &&
    existing.expiresAt > now
  ) {
    return res.status(409).json({
      ok: false,
      message:
        "This UID is already active and bound to another device."
    });
  }

  const record = {
    uid,
    deviceId: existing?.deviceId || null,
    activatedAt: now,
    expiresAt,
    durationHours: hours
  };

  if (existingIndex >= 0) {
    list[existingIndex] = record;
  } else {
    list.push(record);
  }

  writeUIDs(list);

  res.json({
    ok: true,
    message: `UID ${uid} activated for ${
      hours === 1 ? "1 hour" : "1 day"
    }.`,
    record
  });
});

// ------------------------------------------------------------
// ADMIN - LOCK ONE UID
// ------------------------------------------------------------

app.post("/api/admin/lock", requireAdmin, (req, res) => {
  const uid = String(req.body.uid || "").trim();

  if (!validUID(uid)) {
    return res.status(400).json({
      ok: false,
      message: "Invalid UID."
    });
  }

  const list = saveCleanUIDs();

  const newList = list.filter(
    (item) => item.uid !== uid
  );

  writeUIDs(newList);

  res.json({
    ok: true,
    message: `UID ${uid} locked.`
  });
});

// ------------------------------------------------------------
// ADMIN - LOCK ALL
// ------------------------------------------------------------

app.post("/api/admin/lock-all", requireAdmin, (req, res) => {
  writeUIDs([]);

  res.json({
    ok: true,
    message: "All UID access has been locked."
  });
});

// ------------------------------------------------------------
// USER - REGISTER / CHECK UID
// ------------------------------------------------------------
//
// First device which verifies an activated UID gets ownership.
// After that the UID works only on that device.
// ------------------------------------------------------------

app.post("/api/access/check", (req, res) => {
  const uid = String(req.body.uid || "").trim();
  const deviceId = String(req.body.deviceId || "").trim();

  if (!validUID(uid)) {
    return res.status(400).json({
      ok: false,
      active: false,
      message: "Please enter a valid 5–8 digit Game UID."
    });
  }

  if (!validDeviceId(deviceId)) {
    return res.status(400).json({
      ok: false,
      active: false,
      message: "Invalid device ID."
    });
  }

  let list = saveCleanUIDs();

  const index = list.findIndex(
    (item) => item.uid === uid
  );

  // UID has not been activated by admin
  if (index === -1) {
    return res.json({
      ok: true,
      active: false,
      approved: false,
      message: "UID is not active."
    });
  }

  const record = list[index];

  // Expired
  if (Number(record.expiresAt) <= Date.now()) {
    list.splice(index, 1);
    writeUIDs(list);

    return res.json({
      ok: true,
      active: false,
      approved: false,
      message: "UID access has expired."
    });
  }

  // First device claims the UID
  if (!record.deviceId) {
    record.deviceId = deviceId;
    record.boundAt = Date.now();

    list[index] = record;
    writeUIDs(list);

    return res.json({
      ok: true,
      active: true,
      approved: true,
      claimed: true,
      uid: record.uid,
      expiresAt: record.expiresAt,
      message: "UID activated on this device."
    });
  }

  // Same device
  if (record.deviceId === deviceId) {
    return res.json({
      ok: true,
      active: true,
      approved: true,
      claimed: false,
      uid: record.uid,
      expiresAt: record.expiresAt,
      message: "UID access is active."
    });
  }

  // Different device
  return res.json({
    ok: true,
    active: false,
    approved: false,
    deviceMismatch: true,
    message:
      "This UID is already bound to another device."
  });
});

// ------------------------------------------------------------
// USER - ACCESS STATUS
// ------------------------------------------------------------

app.post("/api/access/status", (req, res) => {
  const uid = String(req.body.uid || "").trim();
  const deviceId = String(req.body.deviceId || "").trim();

  if (!validUID(uid) || !validDeviceId(deviceId)) {
    return res.json({
      ok: true,
      active: false
    });
  }

  const list = saveCleanUIDs();

  const record = list.find(
    (item) => item.uid === uid
  );

  if (!record) {
    return res.json({
      ok: true,
      active: false
    });
  }

  if (
    record.expiresAt > Date.now() &&
    record.deviceId === deviceId
  ) {
    return res.json({
      ok: true,
      active: true,
      uid: record.uid,
      expiresAt: record.expiresAt
    });
  }

  return res.json({
    ok: true,
    active: false
  });
});

// ------------------------------------------------------------
// LIVE HISTORY PROXY
// ------------------------------------------------------------

app.get("/api/history", async (req, res) => {
  try {
    const response = await fetch(HISTORY_URL, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent":
          "Mozilla/5.0 AMBIKA-PANE-AI"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `History server returned ${response.status}`
      );
    }

    const text = await response.text();

    let json;

    try {
      json = JSON.parse(text);
    } catch (error) {
      throw new Error("History response was not JSON.");
    }

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate"
    );

    res.json(json);
  } catch (error) {
    console.error("History proxy error:", error);

    res.status(502).json({
      ok: false,
      message: "Live history unavailable."
    });
  }
});

// ------------------------------------------------------------
// HEALTH CHECK
// ------------------------------------------------------------

app.get("/health", (req, res) => {
  res.json({
    status: "online",
    service: "AMBIKA PANE AI",
    time: new Date().toISOString()
  });
});

// ------------------------------------------------------------
// STATIC FRONTEND
// ------------------------------------------------------------

const PUBLIC_DIR = path.join(__dirname, "public");

app.use(express.static(PUBLIC_DIR, {
  extensions: ["html"]
}));

// Express 5 compatible SPA fallback
app.get(/.*/, (req, res) => {
  const indexFile = path.join(
    PUBLIC_DIR,
    "index.html"
  );

  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.status(404).send(
      "AMBIKA PANE AI frontend not found."
    );
  }
});

// ------------------------------------------------------------
// START SERVER
// ------------------------------------------------------------

app.listen(PORT, () => {
  console.log("");
  console.log("======================================");
  console.log("       AMBIKA PANE AI SERVER");
  console.log("======================================");
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Admin API: /api/admin/login`);
  console.log(`UID API: /api/access/check`);
  console.log(`History API: /api/history`);
  console.log("======================================");
  console.log("");
});