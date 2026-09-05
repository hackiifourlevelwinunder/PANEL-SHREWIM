// ==========================================
// AMBIKA PANE AI — ADMIN.JS
// PART 1 / 3
// ==========================================

(() => {
    "use strict";

    const ADMIN_TOKEN_KEY =
        "ambika_admin_token_v2";

    let adminToken =
        sessionStorage.getItem(
            ADMIN_TOKEN_KEY
        ) || "";

    let adminUIDs = [];

    // ----------------------------------------
    // HELPERS
    // ----------------------------------------

    function $(id) {
        return document.getElementById(id);
    }

    function adminMessage(message) {
        const box =
            $("adminMessage") ||
            $("adminStatus") ||
            $("adminInfo");

        if (box) {
            box.textContent = message;
        } else {
            console.log(
                "[AMBIKA ADMIN]",
                message
            );
        }
    }

    function saveAdminToken(token) {
        adminToken = token || "";

        if (adminToken) {
            sessionStorage.setItem(
                ADMIN_TOKEN_KEY,
                adminToken
            );
        } else {
            sessionStorage.removeItem(
                ADMIN_TOKEN_KEY
            );
        }
    }

    function clearAdminToken() {
        saveAdminToken("");
    }

    async function request(url, options = {}) {
        try {
            const headers = {
                "Content-Type":
                    "application/json",
                ...(options.headers || {})
            };

            if (adminToken) {
                headers.Authorization =
                    `Bearer ${adminToken}`;
            }

            const response =
                await fetch(url, {
                    cache: "no-store",
                    ...options,
                    headers
                });

            const data =
                await response
                    .json()
                    .catch(() => ({}));

            return {
                ok: response.ok,
                status: response.status,
                data
            };

        } catch (error) {
            console.error(
                "Admin API error:",
                error
            );

            return {
                ok: false,
                status: 0,
                data: {
                    error:
                        "Server connection failed."
                }
            };
        }
    }


    // ----------------------------------------
    // ADMIN OVERLAY
    // ----------------------------------------

    function openAdmin() {
        const overlay =
            $("adminOverlay");

        if (!overlay) return;

        overlay.style.display = "flex";

        if (adminToken) {
            showAdminControls();
            loadUIDs();
        } else {
            showAdminLogin();
        }

        setTimeout(() => {
            const password =
                $("adminPassword");

            if (
                password &&
                !adminToken
            ) {
                password.focus();
            }
        }, 100);
    }

    function closeAdmin() {
        const overlay =
            $("adminOverlay");

        if (overlay) {
            overlay.style.display =
                "none";
        }
    }


    // ----------------------------------------
    // LOGIN / LOGOUT UI
    // ----------------------------------------

    function showAdminLogin() {
        const loginBox =
            $("adminLoginBox");

        const controls =
            $("adminControls");

        if (loginBox) {
            loginBox.style.display =
                "";
        }

        if (controls) {
            controls.style.display =
                "none";
        }
    }

    function showAdminControls() {
        const loginBox =
            $("adminLoginBox");

        const controls =
            $("adminControls");

        if (loginBox) {
            loginBox.style.display =
                "none";
        }

        if (controls) {
            controls.style.display =
                "";
        }
    }


    // ----------------------------------------
    // ADMIN LOGIN
    // ----------------------------------------

    async function adminLogin() {
        const passwordInput =
            $("adminPassword");

        if (!passwordInput) {
            return;
        }

        const password =
            passwordInput.value.trim();

        if (!password) {
            adminMessage(
                "Enter admin password."
            );
            return;
        }

        const loginButton =
            $("adminLoginBtn");

        if (loginButton) {
            loginButton.disabled = true;
            loginButton.textContent =
                "LOGIN...";
        }

        try {
            const result =
                await request(
                    "/api/admin/login",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            password
                        })
                    }
                );

            if (!result.ok) {
                adminMessage(
                    result.data?.error ||
                    "Invalid admin password."
                );

                return;
            }

            const token =
                result.data?.token ||
                result.data?.accessToken ||
                "";

            if (!token) {
                adminMessage(
                    "Login succeeded but token was missing."
                );

                return;
            }

            saveAdminToken(token);

            passwordInput.value = "";

            showAdminControls();

            adminMessage(
                "Admin login successful."
            );

            await loadUIDs();

        } finally {
            if (loginButton) {
                loginButton.disabled =
                    false;

                loginButton.textContent =
                    "LOGIN";
            }
        }
    }


    // ----------------------------------------
    // ADMIN LOGOUT
    // ----------------------------------------

    async function adminLogout() {
        if (adminToken) {
            await request(
                "/api/admin/logout",
                {
                    method: "POST"
                }
            );
        }

        clearAdminToken();
        adminUIDs = [];

        showAdminLogin();

        adminMessage(
            "Admin logged out."
        );
    }


    // ----------------------------------------
    // LOAD UID LIST
    // ----------------------------------------

    async function loadUIDs() {
        if (!adminToken) {
            showAdminLogin();
            return;
        }

        const result =
            await request(
                "/api/admin/uids",
                {
                    method: "GET"
                }
            );

        if (
            result.status === 401 ||
            result.status === 403
        ) {
            clearAdminToken();
            showAdminLogin();

            adminMessage(
                "Admin session expired. Login again."
            );

            return;
        }

        if (!result.ok) {
            adminMessage(
                result.data?.error ||
                "Unable to load UID list."
            );

            return;
        }

        adminUIDs =
            Array.isArray(
                result.data
            )
                ? result.data
                : (
                    result.data?.uids ||
                    result.data?.data ||
                    []
                );

        renderUIDList();
    }


    // ----------------------------------------
    // UID LIST RENDER
    // ----------------------------------------

    function renderUIDList() {
        const list =
            $("adminList");

        if (!list) return;

        if (!adminUIDs.length) {
            list.innerHTML = `
                <div class="adminInfo">
                    No UID access records found.
                </div>
            `;

            return;
        }

        list.innerHTML =
            adminUIDs.map(
                (item) => {
                    const uid =
                        item.uid ||
                        item.gameUID ||
                        item.id ||
                        "";

                    const active =
                        item.active === true ||
                        item.status === "active";

                    const claimed =
                        Boolean(
                            item.deviceId ||
                            item.device ||
                            item.boundDeviceId
                        );

                    const expiry =
                        item.expiresAt ||
                        item.expiry ||
                        item.expires_at ||
                        "";

                    let expiryText =
                        "No expiry";

                    if (expiry) {
                        const date =
                            new Date(expiry);

                        expiryText =
                            isNaN(
                                date.getTime()
                            )
                                ? String(expiry)
                                : date.toLocaleString();
                    }

                    return `
                        <div class="adminUIDItem">
                            <div>
                                <strong>
                                    UID: ${escapeHTML(uid)}
                                </strong>

                                <div class="adminInfo">
                                    Status:
                                    ${active
                                        ? "ACTIVE"
                                        : "LOCKED"}
                                    •
                                    ${claimed
                                        ? "BOUND"
                                        : "UNCLAIMED"}
                                </div>

                                <div class="adminInfo">
                                    ${escapeHTML(
                                        expiryText
                                    )}
                                </div>
                            </div>

                            <button
                                class="adminBtn red"
                                data-lock-uid="${escapeHTML(uid)}"
                            >
                                LOCK
                            </button>
                        </div>
                    `;
                }
            )
            .join("");

        list
            .querySelectorAll(
                "[data-lock-uid]"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        const uid =
                            button.dataset.lockUid;

                        lockUID(uid);
                    }
                );
            });
    }


    // ----------------------------------------
    // HTML ESCAPE
    // ----------------------------------------

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }


    // ----------------------------------------
    // OPEN ADMIN BUTTON
    // ----------------------------------------

    function setupAdminOpen() {
        const button =
            $("adminLaunch");

        if (!button) return;

        button.style.display =
            "block";

        button.addEventListener(
            "click",
            openAdmin
        );
    }


    // ----------------------------------------
    // CLOSE ADMIN BUTTON
    // ----------------------------------------

    function setupAdminClose() {
        const button =
            $("adminClose");

        if (!button) return;

        button.addEventListener(
            "click",
            closeAdmin
        );
    }


    // ----------------------------------------
    // LOGIN BUTTON
    // ----------------------------------------

    function setupLogin() {
        const button =
            $("adminLoginBtn");

        if (button) {
            button.addEventListener(
                "click",
                adminLogin
            );
        }

        const password =
            $("adminPassword");

        if (password) {
            password.addEventListener(
                "keydown",
                event => {
                    if (
                        event.key ===
                        "Enter"
                    ) {
                        adminLogin();
                    }
                }
            );
        }
    }


    // ----------------------------------------
    // ESC TO CLOSE
    // ----------------------------------------

    function setupEscape() {
        document.addEventListener(
            "keydown",
            event => {
                if (
                    event.key !==
                    "Escape"
                ) {
                    return;
                }

                const overlay =
                    $("adminOverlay");

                if (
                    overlay &&
                    overlay.style.display !==
                    "none"
                ) {
                    closeAdmin();
                }
            }
        );
    }


    // ----------------------------------------
    // OUTSIDE CLICK
    // ----------------------------------------

    function setupOutsideClick() {
        const overlay =
            $("adminOverlay");

        if (!overlay) return;

        overlay.addEventListener(
            "click",
            event => {
                if (
                    event.target ===
                    overlay
                ) {
                    closeAdmin();
                }
            }
        );
    }


    // ----------------------------------------
    // INITIALIZATION
    // ----------------------------------------

    function initAdminPart1() {
        setupAdminOpen();
        setupAdminClose();
        setupLogin();
        setupEscape();
        setupOutsideClick();

        console.log(
            "AMBIKA admin.js PART 1 loaded."
        );
    }


    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initAdminPart1,
            { once: true }
        );
    } else {
        initAdminPart1();
    }


    // Export internally
    window.AMBIKA_ADMIN = {
        openAdmin,
        closeAdmin,
        adminLogin,
        adminLogout,
        loadUIDs,
        renderUIDList
    };

})();
// ==========================================
// AMBIKA PANE AI — ADMIN.JS
// PART 2 / 3
// ==========================================


// ------------------------------------------
// ACTIVATE UID
// ------------------------------------------

async function activateUID() {
    const uidInput =
        document.getElementById("adminUid");

    const durationSelect =
        document.getElementById("adminDuration");

    const button =
        document.getElementById("adminActivate");

    if (!uidInput || !durationSelect) {
        return;
    }

    const uid =
        uidInput.value.trim();

    const hours =
        Number(durationSelect.value);

    if (!/^\d{5,8}$/.test(uid)) {
        adminMessage(
            "Game UID must contain 5–8 digits."
        );
        return;
    }

    if (![1, 24].includes(hours)) {
        adminMessage(
            "Invalid activation duration."
        );
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent =
            "ACTIVATING...";
    }

    try {
        const result =
            await request(
                "/api/admin/activate",
                {
                    method: "POST",
                    body: JSON.stringify({
                        uid: uid,
                        hours: hours
                    })
                }
            );

        if (
            result.status === 401 ||
            result.status === 403
        ) {
            clearAdminToken();
            showAdminLogin();

            adminMessage(
                "Admin session expired."
            );

            return;
        }

        if (!result.ok) {
            adminMessage(
                result.data?.error ||
                result.data?.message ||
                "UID activation failed."
            );

            return;
        }

        uidInput.value = "";

        adminMessage(
            `UID ${uid} activated for ${hours === 1 ? "1 hour" : "1 day"}.`
        );

        await loadUIDs();

    } finally {
        if (button) {
            button.disabled = false;
            button.textContent =
                "ACTIVATE UID";
        }
    }
}


// ------------------------------------------
// LOCK ONE UID
// ------------------------------------------

async function lockUID(uid) {
    if (!uid) return;

    const confirmed =
        window.confirm(
            `Lock UID ${uid}?`
        );

    if (!confirmed) {
        return;
    }

    const result =
        await request(
            "/api/admin/lock",
            {
                method: "POST",
                body: JSON.stringify({
                    uid: String(uid)
                })
            }
        );

    if (
        result.status === 401 ||
        result.status === 403
    ) {
        clearAdminToken();
        showAdminLogin();

        adminMessage(
            "Admin session expired."
        );

        return;
    }

    if (!result.ok) {
        adminMessage(
            result.data?.error ||
            "Unable to lock UID."
        );

        return;
    }

    adminMessage(
        `UID ${uid} locked successfully.`
    );

    await loadUIDs();
}


// ------------------------------------------
// LOCK ALL UID ACCESS
// ------------------------------------------

async function lockAllUIDs() {
    const confirmed =
        window.confirm(
            "LOCK ALL UID ACCESS?\n\nThis will immediately remove all active UID access."
        );

    if (!confirmed) {
        return;
    }

    const button =
        document.getElementById(
            "adminDeactivateAll"
        );

    if (button) {
        button.disabled = true;
        button.textContent =
            "LOCKING...";
    }

    try {
        const result =
            await request(
                "/api/admin/lock-all",
                {
                    method: "POST"
                }
            );

        if (
            result.status === 401 ||
            result.status === 403
        ) {
            clearAdminToken();
            showAdminLogin();

            adminMessage(
                "Admin session expired."
            );

            return;
        }

        if (!result.ok) {
            adminMessage(
                result.data?.error ||
                "Unable to lock all UIDs."
            );

            return;
        }

        adminMessage(
            "All UID access has been locked."
        );

        await loadUIDs();

    } finally {
        if (button) {
            button.disabled = false;
            button.textContent =
                "LOCK ALL UID ACCESS";
        }
    }
}


// ------------------------------------------
// REFRESH UID LIST
// ------------------------------------------

async function refreshAdminList() {
    if (!adminToken) {
        showAdminLogin();
        return;
    }

    const button =
        document.getElementById(
            "adminRefresh"
        );

    if (button) {
        button.disabled = true;
        button.textContent =
            "REFRESHING...";
    }

    try {
        await loadUIDs();
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent =
                "REFRESH";
        }
    }
}


// ------------------------------------------
// ADMIN CONTROL EVENTS
// ------------------------------------------

function setupAdminControls() {

    const activateButton =
        document.getElementById(
            "adminActivate"
        );

    if (activateButton) {
        activateButton.addEventListener(
            "click",
            activateUID
        );
    }


    const lockAllButton =
        document.getElementById(
            "adminDeactivateAll"
        );

    if (lockAllButton) {
        lockAllButton.addEventListener(
            "click",
            lockAllUIDs
        );
    }


    const uidInput =
        document.getElementById(
            "adminUid"
        );

    if (uidInput) {

        uidInput.addEventListener(
            "input",
            () => {
                uidInput.value =
                    uidInput.value
                        .replace(/\D/g, "")
                        .slice(0, 8);
            }
        );

        uidInput.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {
                    activateUID();
                }

            }
        );
    }
}


// ------------------------------------------
// OPTIONAL LOGOUT BUTTON
// ------------------------------------------

function setupAdminLogout() {

    const logoutButton =
        document.getElementById(
            "adminLogout"
        );

    if (!logoutButton) {
        return;
    }

    logoutButton.addEventListener(
        "click",
        adminLogout
    );
}


// ------------------------------------------
// OPTIONAL REFRESH BUTTON
// ------------------------------------------

function setupAdminRefresh() {

    const refreshButton =
        document.getElementById(
            "adminRefresh"
        );

    if (!refreshButton) {
        return;
    }

    refreshButton.addEventListener(
        "click",
        refreshAdminList
    );
}


// ------------------------------------------
// AUTO REFRESH WHILE ADMIN PANEL OPEN
// ------------------------------------------

let adminRefreshInterval = null;

function startAdminAutoRefresh() {

    if (adminRefreshInterval) {
        clearInterval(
            adminRefreshInterval
        );
    }

    adminRefreshInterval =
        setInterval(
            () => {

                const overlay =
                    document.getElementById(
                        "adminOverlay"
                    );

                if (
                    !overlay ||
                    overlay.style.display ===
                    "none"
                ) {
                    return;
                }

                if (adminToken) {
                    loadUIDs();
                }

            },
            15000
        );
}


// ------------------------------------------
// INITIALIZE PART 2
// ------------------------------------------

function initAdminPart2() {

    setupAdminControls();
    setupAdminLogout();
    setupAdminRefresh();
    startAdminAutoRefresh();

    console.log(
        "AMBIKA admin.js PART 2 loaded."
    );
}


// ------------------------------------------
// DOM READY
// ------------------------------------------

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initAdminPart2,
        { once: true }
    );

} else {

    initAdminPart2();

}


// ------------------------------------------
// EXTEND GLOBAL ADMIN API
// ------------------------------------------

if (window.AMBIKA_ADMIN) {

    window.AMBIKA_ADMIN.activateUID =
        activateUID;

    window.AMBIKA_ADMIN.lockUID =
        lockUID;

    window.AMBIKA_ADMIN.lockAllUIDs =
        lockAllUIDs;

    window.AMBIKA_ADMIN.refreshAdminList =
        refreshAdminList;

}
// ==========================================
// AMBIKA PANE AI — ADMIN.JS
// PART 3 / 3
// ==========================================


// ------------------------------------------
// ADMIN PANEL STATE
// ------------------------------------------

function getAdminState() {
    return {
        loggedIn: Boolean(adminToken),
        uidCount: Array.isArray(adminUIDs)
            ? adminUIDs.length
            : 0
    };
}


// ------------------------------------------
// FORMAT UID DATA
// ------------------------------------------

function normalizeUIDRecord(item) {
    if (!item) {
        return null;
    }

    return {
        uid: String(
            item.uid ??
            item.gameUID ??
            item.id ??
            ""
        ),

        active:
            item.active === true ||
            item.status === "active",

        deviceId:
            item.deviceId ??
            item.device ??
            item.boundDeviceId ??
            null,

        expiresAt:
            item.expiresAt ??
            item.expiry ??
            item.expires_at ??
            null
    };
}


// ------------------------------------------
// ADMIN PANEL OPEN HOOK
// ------------------------------------------

function setupAdminOpenHook() {
    const button =
        document.getElementById(
            "adminLaunch"
        );

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        () => {
            if (adminToken) {
                loadUIDs();
            }
        }
    );
}


// ------------------------------------------
// ADMIN OVERLAY UI
// ------------------------------------------

function updateAdminVisibility() {
    const loginBox =
        document.getElementById(
            "adminLoginBox"
        );

    const controls =
        document.getElementById(
            "adminControls"
        );

    if (adminToken) {

        if (loginBox) {
            loginBox.style.display =
                "none";
        }

        if (controls) {
            controls.style.display =
                "";
        }

    } else {

        if (loginBox) {
            loginBox.style.display =
                "";
        }

        if (controls) {
            controls.style.display =
                "none";
        }
    }
}


// ------------------------------------------
// ADMIN SESSION CHECK
// ------------------------------------------

async function checkAdminSession() {

    if (!adminToken) {
        updateAdminVisibility();
        return false;
    }

    const result =
        await request(
            "/api/admin/uids",
            {
                method: "GET"
            }
        );

    if (
        result.status === 401 ||
        result.status === 403
    ) {
        clearAdminToken();
        adminUIDs = [];

        updateAdminVisibility();

        return false;
    }

    if (!result.ok) {
        return false;
    }

    adminUIDs =
        Array.isArray(result.data)
            ? result.data
            : (
                result.data?.uids ||
                result.data?.data ||
                []
            );

    renderUIDList();

    updateAdminVisibility();

    return true;
}


// ------------------------------------------
// ADMIN PASSWORD INPUT CLEANUP
// ------------------------------------------

function setupPasswordInput() {

    const input =
        document.getElementById(
            "adminPassword"
        );

    if (!input) {
        return;
    }

    input.setAttribute(
        "autocomplete",
        "current-password"
    );

    input.addEventListener(
        "input",
        () => {

            if (
                input.value.length >
                100
            ) {
                input.value =
                    input.value.slice(
                        0,
                        100
                    );
            }

        }
    );
}


// ------------------------------------------
// ADMIN UID INPUT VALIDATION
// ------------------------------------------

function setupUIDInputValidation() {

    const input =
        document.getElementById(
            "adminUid"
        );

    if (!input) {
        return;
    }

    input.setAttribute(
        "inputmode",
        "numeric"
    );

    input.setAttribute(
        "maxlength",
        "8"
    );

    input.addEventListener(
        "paste",
        () => {

            setTimeout(
                () => {

                    input.value =
                        input.value
                            .replace(
                                /\D/g,
                                ""
                            )
                            .slice(
                                0,
                                8
                            );

                },
                0
            );

        }
    );
}


// ------------------------------------------
// PANEL BACKDROP
// ------------------------------------------

function setupAdminBackdrop() {

    const overlay =
        document.getElementById(
            "adminOverlay"
        );

    if (!overlay) {
        return;
    }

    overlay.addEventListener(
        "mousedown",
        event => {

            if (
                event.target ===
                overlay
            ) {
                closeAdmin();
            }

        }
    );
}


// ------------------------------------------
// ADMIN ERROR HANDLER
// ------------------------------------------

function handleAdminAuthError(
    result
) {

    if (
        result?.status === 401 ||
        result?.status === 403
    ) {

        clearAdminToken();

        adminUIDs = [];

        showAdminLogin();

        adminMessage(
            "Session expired. Please login again."
        );

        return true;
    }

    return false;
}


// ------------------------------------------
// RECHECK SESSION
// ------------------------------------------

let adminSessionTimer = null;

function startAdminSessionCheck() {

    if (adminSessionTimer) {
        clearInterval(
            adminSessionTimer
        );
    }

    adminSessionTimer =
        setInterval(
            async () => {

                const overlay =
                    document.getElementById(
                        "adminOverlay"
                    );

                if (
                    !overlay ||
                    overlay.style.display ===
                    "none"
                ) {
                    return;
                }

                if (!adminToken) {
                    return;
                }

                await checkAdminSession();

            },
            60000
        );
}


// ------------------------------------------
// FINAL ADMIN INITIALIZATION
// ------------------------------------------

function initAdminPart3() {

    setupAdminOpenHook();
    setupPasswordInput();
    setupUIDInputValidation();
    setupAdminBackdrop();

    updateAdminVisibility();

    startAdminSessionCheck();

    if (adminToken) {
        checkAdminSession();
    }

    console.log(
        "AMBIKA admin.js PART 3 loaded."
    );
}


// ------------------------------------------
// DOM READY
// ------------------------------------------

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initAdminPart3,
        { once: true }
    );

} else {

    initAdminPart3();

}


// ------------------------------------------
// COMPLETE GLOBAL ADMIN API
// ------------------------------------------

window.AMBIKA_ADMIN = {
    ...(window.AMBIKA_ADMIN || {}),

    openAdmin,
    closeAdmin,

    login: adminLogin,
    logout: adminLogout,

    activateUID,
    lockUID,
    lockAllUIDs,

    loadUIDs,
    refresh: refreshAdminList,

    checkSession:
        checkAdminSession,

    state:
        getAdminState
};


// ------------------------------------------
// DEBUG MARKER
// ------------------------------------------

window.__AMBIKA_ADMIN_READY__ = true;

console.log(
    "%c AMBIKA ADMIN ",
    "font-weight:bold;font-size:16px"
);

console.log(
    "Admin.js loaded successfully."
);