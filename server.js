const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));

// ===============================
// PATHS
// ===============================

const DATA_DIR = path.join(__dirname, "data");
const UID_FILE = path.join(DATA_DIR, "uids.json");
const REQUEST_FILE = path.join(DATA_DIR, "uid_requests.json");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(UID_FILE)) {
    fs.writeFileSync(UID_FILE, "[]", "utf8");
}

if (!fs.existsSync(REQUEST_FILE)) {
    fs.writeFileSync(REQUEST_FILE, "[]", "utf8");
}

// ===============================
// CONFIG
// ===============================

const ADMIN_PASSWORD =
    process.env.ADMIN_PASSWORD || "673634078162";

const REGISTER_URL =
    "https://www.shreewin55.com/#/register?invitationCode=86286195967";

const HISTORY_URL =
    "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json";

// ===============================
// HELPERS
// ===============================

function readJSON(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (err) {
        return [];
    }
}

function writeJSON(file, data) {
    fs.writeFileSync(
        file,
        JSON.stringify(data, null, 2),
        "utf8"
    );
}

function cleanUID(uid) {
    return String(uid || "").trim();
}

function cleanDeviceId(deviceId) {
    return String(deviceId || "").trim();
}

function now() {
    return Date.now();
}

// ===============================
// ADMIN TOKENS
// ===============================

const adminTokens = new Map();

function createAdminToken() {
    const token = crypto.randomBytes(32).toString("hex");

    adminTokens.set(token, {
        createdAt: now(),
        expiresAt: now() + 12 * 60 * 60 * 1000
    });

    return token;
}

function isAdminTokenValid(token) {
    if (!token) return false;

    const session = adminTokens.get(token);

    if (!session) return false;

    if (session.expiresAt < now()) {
        adminTokens.delete(token);
        return false;
    }

    return true;
}

function requireAdmin(req, res, next) {
    const auth = req.headers.authorization || "";

    const token = auth.startsWith("Bearer ")
        ? auth.slice(7).trim()
        : "";

    if (!isAdminTokenValid(token)) {
        return res.status(401).json({
            success: false,
            message: "Admin authentication required."
        });
    }

    req.adminToken = token;
    next();
}

// ===============================
// CLEAN EXPIRED UIDS
// ===============================

function cleanupExpiredUIDs() {
    const uids = readJSON(UID_FILE);
    const current = now();

    const active = uids.filter(item => {
        if (!item.expiresAt) return true;
        return item.expiresAt > current;
    });

    if (active.length !== uids.length) {
        writeJSON(UID_FILE, active);
    }

    return active;
}
// ===============================
// STATUS
// ===============================

app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        online: true,
        message: "AMBIKA PANE AI server is running."
    });
});

// ===============================
// CONFIG
// ===============================

app.get("/api/config", (req, res) => {
    res.json({
        success: true,
        registerUrl: REGISTER_URL
    });
});

// ===============================
// ADMIN LOGIN
// ===============================

app.post("/api/admin/login", (req, res) => {
    const password = String(req.body?.password || "");

    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({
            success: false,
            message: "Invalid admin password."
        });
    }

    const token = createAdminToken();

    res.json({
        success: true,
        token,
        expiresIn: 12 * 60 * 60 * 1000
    });
});

// ===============================
// ADMIN LOGOUT
// ===============================

app.post("/api/admin/logout", requireAdmin, (req, res) => {
    adminTokens.delete(req.adminToken);

    res.json({
        success: true,
        message: "Admin logged out."
    });
});

// ===============================
// ADMIN: GET ACTIVE UIDS
// ===============================

app.get("/api/admin/uids", requireAdmin, (req, res) => {
    const uids = cleanupExpiredUIDs();

    res.json({
        success: true,
        uids
    });
});

// ===============================
// MEMBER: REQUEST UID ACTIVATION
// ===============================

app.post("/api/access/request", (req, res) => {
    const uid = cleanUID(req.body?.uid);
    const deviceId = cleanDeviceId(req.body?.deviceId);

    if (!uid) {
        return res.status(400).json({
            success: false,
            message: "Game UID is required."
        });
    }

    if (!deviceId) {
        return res.status(400).json({
            success: false,
            message: "Device ID is required."
        });
    }

    const activeUIDs = cleanupExpiredUIDs();

    // Already activated
    const activated = activeUIDs.find(
        item => item.uid === uid
    );

    if (activated) {
        if (
            activated.deviceId &&
            activated.deviceId !== deviceId
        ) {
            return res.json({
                success: false,
                status: "bound",
                message: "This UID is already activated on another device."
            });
        }

        return res.json({
            success: true,
            status: "active",
            message: "UID is already activated.",
            uid: activated.uid,
            expiresAt: activated.expiresAt
        });
    }

    // Pending request check
    let requests = readJSON(REQUEST_FILE);

    const existing = requests.find(
        item =>
            item.uid === uid &&
            item.status === "pending"
    );

    if (existing) {
        existing.lastSeenAt = now();
        existing.deviceId = deviceId;

        writeJSON(REQUEST_FILE, requests);

        return res.json({
            success: true,
            status: "pending",
            message: "UID activation request is already pending."
        });
    }

    // New request
    const request = {
        id: crypto.randomBytes(12).toString("hex"),
        uid,
        deviceId,
        requestedAt: now(),
        lastSeenAt: now(),
        status: "pending"
    };

    requests.unshift(request);

    // Keep file from growing indefinitely
    requests = requests.slice(0, 500);

    writeJSON(REQUEST_FILE, requests);

    res.json({
        success: true,
        status: "pending",
        message: "UID request sent to admin successfully.",
        requestId: request.id
    });
});

// ===============================
// MEMBER: CHECK UID ACCESS
// ===============================

app.post("/api/access/check", (req, res) => {
    const uid = cleanUID(req.body?.uid);
    const deviceId = cleanDeviceId(req.body?.deviceId);

    if (!uid || !deviceId) {
        return res.status(400).json({
            success: false,
            status: "invalid",
            message: "UID and device ID are required."
        });
    }

    const uids = cleanupExpiredUIDs();

    const record = uids.find(
        item => item.uid === uid
    );

    if (!record) {
        return res.json({
            success: false,
            status: "not_active",
            message: "UID is not activated by admin yet."
        });
    }

    // UID already belongs to another device
    if (
        record.deviceId &&
        record.deviceId !== deviceId
    ) {
        return res.json({
            success: false,
            status: "bound",
            message: "This UID is already bound to another device."
        });
    }

    // First successful device claim
    if (!record.deviceId) {
        record.deviceId = deviceId;
        record.boundAt = now();

        writeJSON(UID_FILE, uids);
    }

    res.json({
        success: true,
        status: "active",
        message: "UID successfully activated.",
        uid: record.uid,
        expiresAt: record.expiresAt
    });
});

// ===============================
// MEMBER: ACCESS STATUS
// ===============================

app.post("/api/access/status", (req, res) => {
    const uid = cleanUID(req.body?.uid);
    const deviceId = cleanDeviceId(req.body?.deviceId);

    if (!uid || !deviceId) {
        return res.json({
            success: false,
            status: "invalid"
        });
    }

    const uids = cleanupExpiredUIDs();

    const record = uids.find(
        item => item.uid === uid
    );

    if (!record) {
        return res.json({
            success: false,
            status: "not_active"
        });
    }

    if (
        record.deviceId &&
        record.deviceId !== deviceId
    ) {
        return res.json({
            success: false,
            status: "bound"
        });
    }

    res.json({
        success: true,
        status: "active",
        uid: record.uid,
        expiresAt: record.expiresAt
    });
});
// ===============================
// ADMIN: GET PENDING REQUESTS
// ===============================

app.get("/api/admin/requests", requireAdmin, (req, res) => {
    const requests = readJSON(REQUEST_FILE);

    const pending = requests.filter(
        item => item.status === "pending"
    );

    res.json({
        success: true,
        requests: pending
    });
});

// ===============================
// ADMIN: ACTIVATE UID
// ===============================

app.post("/api/admin/activate", requireAdmin, (req, res) => {
    const uid = cleanUID(req.body?.uid);
    const hours = Number(req.body?.hours || 24);

    if (!uid) {
        return res.status(400).json({
            success: false,
            message: "UID is required."
        });
    }

    if (![1, 24].includes(hours)) {
        return res.status(400).json({
            success: false,
            message: "Hours must be 1 or 24."
        });
    }

    let uids = cleanupExpiredUIDs();

    const existing = uids.find(
        item => item.uid === uid
    );

    if (
        existing &&
        existing.deviceId &&
        existing.expiresAt > now()
    ) {
        return res.json({
            success: false,
            message: "UID is already active."
        });
    }

    // Find member request
    let requests = readJSON(REQUEST_FILE);

    const request = requests.find(
        item =>
            item.uid === uid &&
            item.status === "pending"
    );

    const activatedAt = now();

    const record = {
        uid,
        activatedAt,
        expiresAt:
            activatedAt + hours * 60 * 60 * 1000,
        hours,
        deviceId: request?.deviceId || null,
        boundAt: request?.deviceId
            ? activatedAt
            : null
    };

    // Replace old record if present
    uids = uids.filter(
        item => item.uid !== uid
    );

    uids.push(record);

    writeJSON(UID_FILE, uids);

    // Mark request as approved
    if (request) {
        request.status = "approved";
        request.approvedAt = activatedAt;
        request.expiresAt = record.expiresAt;
    }

    writeJSON(REQUEST_FILE, requests);

    res.json({
        success: true,
        message: "UID successfully activated.",
        uid: record.uid,
        expiresAt: record.expiresAt,
        hours
    });
});

// ===============================
// ADMIN: REJECT REQUEST
// ===============================

app.post("/api/admin/requests/reject", requireAdmin, (req, res) => {
    const uid = cleanUID(req.body?.uid);

    if (!uid) {
        return res.status(400).json({
            success: false,
            message: "UID is required."
        });
    }

    const requests = readJSON(REQUEST_FILE);

    const request = requests.find(
        item =>
            item.uid === uid &&
            item.status === "pending"
    );

    if (!request) {
        return res.json({
            success: false,
            message: "Pending request not found."
        });
    }

    request.status = "rejected";
    request.rejectedAt = now();

    writeJSON(REQUEST_FILE, requests);

    res.json({
        success: true,
        message: "UID request rejected."
    });
});

// ===============================
// ADMIN: LOCK UID
// ===============================

app.post("/api/admin/lock", requireAdmin, (req, res) => {
    const uid = cleanUID(req.body?.uid);

    if (!uid) {
        return res.status(400).json({
            success: false,
            message: "UID is required."
        });
    }

    let uids = cleanupExpiredUIDs();

    const before = uids.length;

    uids = uids.filter(
        item => item.uid !== uid
    );

    writeJSON(UID_FILE, uids);

    res.json({
        success: true,
        locked: before !== uids.length,
        message: "UID locked successfully."
    });
});

// ===============================
// ADMIN: LOCK ALL
// ===============================

app.post("/api/admin/lock-all", requireAdmin, (req, res) => {
    writeJSON(UID_FILE, []);

    res.json({
        success: true,
        message: "All UIDs have been locked."
    });
});
// ===============================
// LIVE HISTORY PROXY
// ===============================

let historyCache = {
    success: false,
    data: {
        list: []
    },
    cachedAt: 0
};

app.get("/api/history", async (req, res) => {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, 10000);

    try {
        const url =
            HISTORY_URL +
            (HISTORY_URL.includes("?") ? "&" : "?") +
            "_t=" +
            Date.now();

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json,text/plain,*/*",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
                "Referer":
                    "https://draw.ar-lottery01.com/"
            },
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(
                `History API HTTP ${response.status}`
            );
        }

        const json = await response.json();

        historyCache = {
            success: true,
            data: json?.data || { list: [] },
            cachedAt: Date.now()
        };

        return res.json({
            success: true,
            data: json?.data || { list: [] }
        });

    } catch (error) {
        console.error(
            "History API error:",
            error.message
        );

        // Return last successful response if available
        if (
            historyCache.success &&
            historyCache.data?.list?.length
        ) {
            return res.json({
                success: true,
                data: historyCache.data,
                cached: true,
                message:
                    "Live history temporarily unavailable. Showing last successful data."
            });
        }

        return res.json({
            success: false,
            data: {
                list: []
            },
            message:
                "Live result connection temporarily unavailable."
        });

    } finally {
        clearTimeout(timeout);
    }
});

// ===============================
// HEALTH CHECK
// ===============================

app.get("/health", (req, res) => {
    res.json({
        success: true,
        status: "ok",
        uptime: process.uptime(),
        time: new Date().toISOString()
    });
});

// ===============================
// STATIC FRONTEND
// ===============================

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

// ===============================
// FRONTEND FALLBACK
// Express 5 compatible
// ===============================

app.use((req, res, next) => {
    if (
        req.method !== "GET" ||
        req.path.startsWith("/api/")
    ) {
        return next();
    }

    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});

// ===============================
// ERROR HANDLER
// ===============================

app.use((err, req, res, next) => {
    console.error("Server error:", err);

    res.status(500).json({
        success: false,
        message: "Internal server error."
    });
});

// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {
    console.log(
        `AMBIKA PANE AI server running on port ${PORT}`
    );

    console.log(
        `Register URL: ${REGISTER_URL}`
    );
});