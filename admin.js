/**
 * ================================================================
 * admin.js
 * Medi Void Admin Panel - Simple, Non-Technical User Friendly
 * ================================================================
 * Features:
 *  - Auto ID from existing DB
 *  - Category drop-down from existing medicineCategories
 *  - Clickable "Used For" chips from symptomToMedicineMap targets
 *  - Live medicine card preview
 *  - Form validation (gentle warnings, not blocking)
 *  - JSON generator (for both medicines.json & medicines-data.js)
 *  - One-click Copy to Clipboard
 *  - Live Test Mode (temporary inject into localStorage for preview)
 *  - Full DB JSON export (backup)
 *  - Clear live tests
 * ================================================================
 */

(function () {
    "use strict";

    /* =========================================================
     * ADMIN LOGIN GATE (runs FIRST, before anything else)
     * Credentials:
     *   Username: ankit&sahil   (literal & between names)
     *   Password: jangra
     * Unlock saved in sessionStorage — browser close = re-lock
     * ========================================================= */
    const GATE_USER = "ankit&sahil";
    const GATE_PASS = "jangra";
    const SS_GATE_KEY = "medivoid.admin_unlocked";

    function hideGate() {
        const gate = document.getElementById("admin-gate");
        if (!gate) return;
        const box = gate.querySelector(".gate-login-box");
        if (box) {
            box.style.transition = "all 400ms ease !important";
            box.style.opacity = "0";
            box.style.transform = "translate(-50%, -50%) scale(0.9)";
        }
        gate.style.transition = "opacity 350ms ease";
        gate.style.opacity = "0";
        setTimeout(() => gate.remove(), 420);
    }

    function showGateMsg(text, danger) {
        const el = document.getElementById("gate-msg");
        if (!el) return;
        el.innerHTML = `<div class="${danger ? "gate-err" : "gate-ok"}">${text}</div>`;
        el.classList.remove("hidden");
    }

    function isUnlocked() {
        try { return sessionStorage.getItem(SS_GATE_KEY) === "1"; }
        catch (_) { return false; }
    }
    function setUnlocked() {
        try { sessionStorage.setItem(SS_GATE_KEY, "1"); } catch (_) {}
    }

    function shakeBox() {
        const box = document.querySelector("#admin-gate .gate-login-box");
        if (!box) return;
        box.animate(
            [
                { transform: "translate(-50%, -50%)" },
                { transform: "translate(calc(-50% - 10px), -50%)" },
                { transform: "translate(calc(-50% + 10px), -50%)" },
                { transform: "translate(calc(-50% - 7px), -50%)" },
                { transform: "translate(calc(-50% + 7px), -50%)" },
                { transform: "translate(-50%, -50%)" }
            ],
            { duration: 380, easing: "ease-in-out" }
        );
    }

    /* Fallback: add/remove .filled class so label float works even if
       :not(:placeholder-shown) CSS selector buggy on some browsers */
    function wireFilledState(inputEl) {
        const sync = () => {
            if (inputEl.value && inputEl.value.length > 0) {
                inputEl.classList.add("filled");
            } else {
                inputEl.classList.remove("filled");
            }
        };
        inputEl.addEventListener("input", sync);
        inputEl.addEventListener("change", sync);
        inputEl.addEventListener("blur", sync);
        inputEl.addEventListener("keyup", sync);
        sync();
    }

    function initGate() {
        // If already unlocked, open gate immediately
        if (isUnlocked()) {
            hideGate();
            return;
        }

        const gate = document.getElementById("admin-gate");
        const userEl = document.getElementById("gate-user");
        const passEl = document.getElementById("gate-pass");
        const btnEl  = document.getElementById("gate-submit");
        const formEl = document.getElementById("gate-form");
        if (!gate || !userEl || !passEl || !btnEl) return;

        document.body.style.overflow = "hidden";

        wireFilledState(userEl);
        wireFilledState(passEl);

        function attempt() {
            const u = userEl.value;
            const p = passEl.value;
            if (!u || !p) {
                showGateMsg("Please fill both fields.", true);
                shakeBox();
                return;
            }
            if (u === GATE_USER && p === GATE_PASS) {
                setUnlocked();
                showGateMsg("Access granted — welcome Admin!", false);
                document.body.style.overflow = "";
                setTimeout(hideGate, 650);
            } else {
                shakeBox();
                showGateMsg("Wrong credentials — redirecting to home…", true);
                setTimeout(() => {
                    window.location.replace("index.html");
                }, 1200);
            }
        }

        btnEl.addEventListener("click", (e) => { e.preventDefault(); attempt(); });
        if (formEl) formEl.addEventListener("submit", (e) => { e.preventDefault(); attempt(); });

        setTimeout(() => userEl.focus(), 180);
    }

    // Gate must run regardless of page (as long as admin-gate div exists)
    if (document.getElementById("admin-gate")) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", initGate, { once: true });
        } else {
            initGate();
        }
    }

    /* =========================================================
     * RUN ONLY ON ADMIN PAGE
     * ========================================================= */
    if (!document.getElementById("medicine-form")) return;

    const LS_ADMIN_TEST_KEY = "medivoid.admin_test_meds";

    const iconMap = {
        "pill": "💊",
        "capsule": "💊",
        "syrup": "🧪",
        "cream": "🧴",
        "drops": "👁️",
        "spray": "💨",
        "injection": "💉",
        "powder": "🫖"
    };

    const foodMap = {
        "Either": "🍽️ Either",
        "After food": "🍲 After Food",
        "Before food": "⏰ Before Food"
    };

    /* =========================================================
     * WAIT FOR DB TO BE READY (async load)
     * ========================================================= */
    waitForDB().then(initAdmin).catch(err => {
        console.error("Admin failed to init (DB not ready)", err);
        setTimeout(initAdmin, 800);
    });

    function waitForDB() {
        return new Promise(resolve => {
            let tries = 0;
            const tick = () => {
                if (window.MediVoidDB && typeof window.MediVoidDB.db === "object" && window.MediVoidDB.db.length > 5) {
                    resolve(window.MediVoidDB);
                } else if (tries++ < 25) {
                    setTimeout(tick, 120);
                } else {
                    resolve(null);
                }
            };
            tick();
        });
    }

    /* =========================================================
     * INIT ADMIN PANEL
     * ========================================================= */
    function initAdmin() {
        const DB = window.MediVoidDB || null;

        // 1) Populate Category dropdown with existing categories
        populateCategoryDropdown(DB);

        // 2) Used-For suggestion chips (right-hand targets from symptomToMedicineMap)
        populateUsedForSuggestions();

        // 3) Set Auto ID
        setNextAutoId(DB);

        // 4) Fill smart defaults (so form is not empty)
        setSmartDefaults();

        // 5) Live preview bindings
        bindLivePreview();

        // 6) Generate button
        const genBtn = document.getElementById("btn-generate");
        genBtn.addEventListener("click", generateOutput);

        // 7) Reset button
        document.getElementById("btn-reset").addEventListener("click", () => {
            const frm = document.getElementById("medicine-form");
            frm.reset();
            setNextAutoId(DB);
            setSmartDefaults();
            renderPreview(gatherFormData());
            hideOutput();
            hideLiveMsg();
        });

        // 8) Copy to clipboard buttons
        document.getElementById("copy-json").addEventListener("click", () =>
            copyEl("out-json", "✅ Step A Copied! Ab medicines.json mein paste karo."));
        document.getElementById("copy-js").addEventListener("click", () =>
            copyEl("out-js", "✅ Step B Copied! Ab medicines-data.js mein paste karo."));

        // 9) Live Test
        document.getElementById("btn-live-test").addEventListener("click", () => doLiveTest(DB));

        // 10) Clear Live Tests
        document.getElementById("btn-clear-test").addEventListener("click", clearLiveTests);

        // 11) Export Full DB
        document.getElementById("btn-export-db").addEventListener("click", exportFullDB);

        // 12) Used-For chips click to add
        document.getElementById("usedfor-suggestions").addEventListener("click", (e) => {
            const chip = e.target.closest("[data-uf]");
            if (!chip) return;
            const val = chip.getAttribute("data-uf");
            const input = document.getElementById("f-usedFor");
            const cur = input.value.split(",").map(s => s.trim()).filter(Boolean);
            if (cur.includes(val)) return;
            cur.push(val);
            input.value = cur.join(", ");
            renderPreview(gatherFormData());
        });

        // Year in footer
        const y = document.getElementById("year");
        if (y) y.textContent = new Date().getFullYear();

        // Initial preview (blank)
        renderPreview(gatherFormData());
    }

    /* =========================================================
     * POPULATE CATEGORY DROPDOWN
     * ========================================================= */
    function populateCategoryDropdown(DB) {
        const sel = document.getElementById("f-category");
        if (!sel) return;
        let cats = [];
        if (DB && typeof DB.getAllCategories === "function") {
            cats = DB.getAllCategories();
        } else if (typeof window.medicineCategories !== "undefined" && Array.isArray(window.medicineCategories)) {
            cats = window.medicineCategories.slice();
        }
        // If DB categories empty, fallback to known list
        if (!cats.length) {
            cats = ["Pain Relief", "Acidity / Gastric", "Anti-allergy", "Cold Cough Syrup",
                "Vitamin Supplement", "Antibiotic", "Skin Care", "Anti-diabetic"];
        }
        sel.innerHTML = "";
        cats.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c;
            opt.textContent = c;
            sel.appendChild(opt);
        });
    }

    /* =========================================================
     * POPULATE USED-FOR CHIPS (from symptomToMedicineMap target values)
     * ========================================================= */
    function populateUsedForSuggestions() {
        const wrap = document.getElementById("usedfor-suggestions");
        if (!wrap) return;
        const source = (typeof window.symptomToMedicineMap === "object" && window.symptomToMedicineMap)
            ? window.symptomToMedicineMap : {};
        const targets = new Set();
        Object.values(source).forEach(arr => {
            if (Array.isArray(arr)) arr.forEach(x => targets.add(x));
        });
        const sorted = Array.from(targets).sort((a, b) => a.localeCompare(b));
        wrap.innerHTML = "";
        sorted.forEach(val => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "chip chip-filter";
            chip.setAttribute("data-uf", val);
            chip.textContent = val;
            wrap.appendChild(chip);
        });
    }

    /* =========================================================
     * AUTO ID
     * ========================================================= */
    function setNextAutoId(DB) {
        const field = document.getElementById("f-id");
        if (!field) return;
        let maxId = 0;
        if (DB && Array.isArray(DB.db)) {
            for (const m of DB.db) if (m && typeof m.id === "number" && m.id > maxId) maxId = m.id;
        }
        // Plus any already-staged live tests
        try {
            const tests = JSON.parse(localStorage.getItem(LS_ADMIN_TEST_KEY) || "[]");
            for (const m of tests) if (m && typeof m.id === "number" && m.id > maxId) maxId = m.id;
        } catch (_) {}
        field.value = String(maxId + 1);
    }

    /* =========================================================
     * SMART DEFAULTS
     * ========================================================= */
    function setSmartDefaults() {
        const safeSet = (id, val) => { const el = document.getElementById(id); if (el && !el.value) el.value = val; };
        safeSet("f-type", "OTC");
        safeSet("f-food", "Either");
        safeSet("f-image", "pill");
        safeSet("f-storage", "Store at room temperature below 30°C. Keep dry and away from children.");
        safeSet("f-warning", "Consult doctor before use if pregnant, breastfeeding, or have a chronic condition. Read package leaflet.");
    }

    /* =========================================================
     * GATHER FORM DATA into clean medicine object
     * ========================================================= */
    function gatherFormData() {
        const get = id => {
            const el = document.getElementById(id);
            return el ? el.value : "";
        };
        const splitArr = (s) => String(s || "").split(",").map(x => x.trim()).filter(Boolean);
        const idVal = parseInt(get("f-id"), 10);
        return {
            id: Number.isFinite(idVal) && idVal > 0 ? idVal : Date.now(),
            name: String(get("f-name") || "").trim(),
            category: String(get("f-category") || "General").trim(),
            keywords: splitArr(get("f-keywords")),
            description: String(get("f-description") || "").trim(),
            usedFor: splitArr(get("f-usedFor")),
            food: String(get("f-food") || "Either").trim(),
            typicalUse: String(get("f-typicalUse") || "").trim(),
            sideEffects: splitArr(get("f-sideEffects")),
            avoidIf: splitArr(get("f-avoidIf")),
            storage: String(get("f-storage") || "").trim(),
            warning: String(get("f-warning") || "").trim(),
            type: String(get("f-type") || "OTC").trim(),
            image: String(get("f-image") || "pill").trim()
        };
    }

    /* =========================================================
     * VALIDATION (Return list of warning strings)
     * ========================================================= */
    function validate(med) {
        const warn = [];
        if (!med.name) warn.push("❌ Medicine Name zaruri hai (likho bina kaam nahi chalega)");
        if (!med.description || med.description.length < 8) warn.push("⚠️ Description thoda likho — search aur preview ke liye zaruri hai");
        if (!med.usedFor.length) warn.push("⚠️ Used For mein kam-se-kam 1 chip tap karo ya likho — symptom search ispe depend karta hai");
        if (!med.keywords.length) warn.push("⚠️ Keywords (brand names) daalo — jaise 'dolo, crocin' — nahi toh direct name search weak hoga");
        if (!med.typicalUse) warn.push("ℹ️ Typical Use / Dosage daalna na bhoolo — users ko yeh chahiye");
        if (med.warning && med.warning.length < 20) warn.push("ℹ️ Warning thoda detailed likho (20+ chars)");
        return warn;
    }

    /* =========================================================
     * LIVE PREVIEW RENDER
     * ========================================================= */
    function renderPreview(med) {
        const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val == null ? "—" : String(val); };
        setText("preview-name", med.name || "👈 Medicine Name Daalo");
        setText("preview-desc", med.description || "Jaise hi form bharoge, yahan live preview dikhne lagega.");
        setText("preview-category", med.category || "—");
        setText("preview-type", med.type || "OTC");
        setText("preview-food", foodMap[med.food] || med.food || "—");
        setText("preview-count", (med.usedFor ? med.usedFor.length : 0) + " items");
        setText("preview-kw", String(med.keywords ? med.keywords.length : 0));

        const iconEl = document.getElementById("preview-icon");
        if (iconEl) iconEl.textContent = iconMap[med.image] || "💊";

        const typeEl = document.getElementById("preview-type");
        if (typeEl) {
            typeEl.classList.remove("badge-otc");
            if (med.type === "Prescription") {
                typeEl.className = "badge badge-info";
                typeEl.textContent = "📋 Rx";
            } else {
                typeEl.className = "badge badge-otc";
                typeEl.textContent = "💊 OTC";
            }
        }

        const ufEl = document.getElementById("preview-usedfor");
        if (ufEl) {
            ufEl.innerHTML = "";
            (med.usedFor || []).forEach(u => {
                const sp = document.createElement("span");
                sp.className = "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold"
                    + " transition-colors whitespace-nowrap";
                sp.style.background = "var(--color-primary-bg)";
                sp.style.color = "var(--color-primary)";
                sp.textContent = "✚ " + u;
                ufEl.appendChild(sp);
            });
        }
    }

    /* =========================================================
     * BIND LIVE PREVIEW ON INPUT CHANGE
     * ========================================================= */
    function bindLivePreview() {
        const form = document.getElementById("medicine-form");
        if (!form) return;
        form.addEventListener("input", () => renderPreview(gatherFormData()));
        form.addEventListener("change", () => renderPreview(gatherFormData()));
    }

    /* =========================================================
     * GENERATE OUTPUT
     * ========================================================= */
    function generateOutput() {
        const med = gatherFormData();
        renderPreview(med);

        const warnings = validate(med);

        // Warnings above output
        showLiveMsg(buildWarningsHtml(warnings), warnings.some(w => w.startsWith("❌")) ? "danger" : "info");

        if (warnings.some(w => w.startsWith("❌"))) {
            hideOutput();
            return;
        }

        // Format as JSON object (for end of medicines.json array)
        // Use 2-space indent, standard JSON
        const jsonStr = JSON.stringify(med, null, 2);

        // medicines.json insertion: user needs to paste after last item with comma before
        // We show a snippet with leading comma + indent 2
        const snippetForJSON = ",\n" + indentEach(jsonStr, 2);

        // medicines-data.js insertion (same as JSON - MEDICINES_INLINE is raw JSON)
        const snippetForJS = snippetForJSON;

        document.getElementById("out-json").textContent = snippetForJSON;
        document.getElementById("out-js").textContent = snippetForJS;
        document.getElementById("output-section").classList.remove("hidden");
        document.getElementById("output-section").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    /* =========================================================
     * BUILD WARNINGS HTML CARD
     * ========================================================= */
    function buildWarningsHtml(warnings) {
        if (!warnings.length) {
            return `<div class="info-card"><h3 class="!mb-1">✅ Sab Badhiya!</h3>
                <p class="text-sm" style="color:var(--color-text-soft)">Form complete lagta hai. Neeche text boxes copy karo aur paste karo.</p></div>`;
        }
        return `<div class="card p-5" style="background:${warnings.some(w => w.startsWith("❌")) ? "var(--color-danger-bg)" : "var(--color-primary-bg)"};border-color:var(${warnings.some(w => w.startsWith("❌")) ? "--color-danger" : "--color-primary-light"});">
            <h3 class="font-bold mb-2" style="color:var(--color-text)">
                ${warnings.some(w => w.startsWith("❌")) ? "🚫 Thoda or fill karo:" : "💡 Friendly Check:"}
            </h3>
            <ul class="space-y-1 text-sm">${warnings.map(w => `<li class="flex gap-2 items-start"><span>${w.split(" ")[0]}</span><span>${w.split(" ").slice(1).join(" ")}</span></li>`).join("")}</ul>
        </div>`;
    }

    /* =========================================================
     * COPY TO CLIPBOARD
     * ========================================================= */
    function copyEl(elId, successToast) {
        const el = document.getElementById(elId);
        if (!el) return;
        const text = el.textContent || "";
        if (!text.trim()) return;
        doCopy(text).then(ok => {
            showLiveMsg(`
                <div class="info-card">
                    <h3 class="!mb-1">${ok ? successToast : "❌ Copy fail! Manually select text + copy karo."}</h3>
                    <p class="text-sm" style="color:var(--color-text-soft)">${ok ? "Ab file kholo, end mein jao, last medicine ke baad comma lagakar paste karo." : "Text ko mouse se highlight karke Ctrl+C / Cmd+C dabao."}</p>
                </div>`, "success");
        });
    }

    function doCopy(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text).then(() => true).catch(() => legacyCopy(text));
        }
        return Promise.resolve(legacyCopy(text));
    }
    function legacyCopy(text) {
        try {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand("copy");
            document.body.removeChild(ta);
            return ok;
        } catch (_) { return false; }
    }

    /* =========================================================
     * LIVE TEST MODE (Inject into localStorage based override)
     * ========================================================= */
    function doLiveTest(DB) {
        const med = gatherFormData();
        renderPreview(med);
        const warnings = validate(med);
        if (warnings.some(w => w.startsWith("❌"))) {
            showLiveMsg(buildWarningsHtml(warnings), "danger");
            return;
        }

        // Ensure ID not colliding — if already exists in DB, auto bump
        if (DB && Array.isArray(DB.db) && DB.db.some(m => m.id === med.id)) {
            med.id = Math.max(...DB.db.map(m => m.id)) + 1;
            document.getElementById("f-id").value = String(med.id);
        }

        let tests;
        try { tests = JSON.parse(localStorage.getItem(LS_ADMIN_TEST_KEY) || "[]"); }
        catch (_) { tests = []; }
        if (!Array.isArray(tests)) tests = [];
        tests.push(med);
        localStorage.setItem(LS_ADMIN_TEST_KEY, JSON.stringify(tests));

        showLiveMsg(`
            <div class="info-card" style="background: var(--color-primary-bg); border-color: var(--color-primary-light);">
                <h3 class="!mb-2">🧪 Live Test Activate Ho Gaya!</h3>
                <p class="text-sm mb-2" style="color:var(--color-text-soft)">
                    Ab yeh medicine <b>temporary</b> site pe aa gaya hai. Check karo:
                </p>
                <div class="flex flex-wrap gap-2">
                    <a href="index.html?q=${encodeURIComponent(med.name)}" target="_blank" class="btn btn-primary btn-sm inline-flex items-center gap-1.5">🔍 Search Mein Check Karo</a>
                    <a href="categories.html" target="_blank" class="btn btn-outline btn-sm inline-flex items-center gap-1.5">🗂 Category Count Check</a>
                    <a href="az-list.html" target="_blank" class="btn btn-outline btn-sm inline-flex items-center gap-1.5">🔤 A-Z List Mein Check</a>
                </div>
                <p class="text-xs mt-3" style="color:var(--color-text-muted)">
                    ⏳ Ye temporary hai — page refresh ya browser close → hat jayega. Permanently save karne ke liye Step A + Step B copy-paste karo (upar waala output).
                </p>
            </div>`, "success");

        setNextAutoId(DB);
    }

    function clearLiveTests() {
        localStorage.removeItem(LS_ADMIN_TEST_KEY);
        const DB = window.MediVoidDB || null;
        setNextAutoId(DB);
        showLiveMsg(`
            <div class="info-card">
                <h3 class="!mb-1">🧹 Saare Live Tests Clear Ho Gaye</h3>
                <p class="text-sm" style="color:var(--color-text-soft)">Ab temporary medicines nahi dikhengi. Jo permanently paste kiye the woh rahenge hi.</p>
            </div>`, "info");
    }

    /* =========================================================
     * SHOW/HIDE OUTPUT AREA + MESSAGE AREA
     * ========================================================= */
    function hideOutput() {
        const o = document.getElementById("output-section");
        if (o) o.classList.add("hidden");
    }
    function showLiveMsg(html, kind) {
        const el = document.getElementById("live-msg");
        if (!el) return;
        el.innerHTML = html;
        el.classList.remove("hidden");
        el.className = "";
        if (kind === "danger") el.classList.add("animate-fade-up", "mb-5");
        else if (kind === "success") el.classList.add("animate-fade-up", "mb-5");
        else el.classList.add("animate-fade-up", "mb-5");
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }
    function hideLiveMsg() {
        const el = document.getElementById("live-msg");
        if (el) el.classList.add("hidden");
    }

    /* =========================================================
     * EXPORT FULL DB JSON (for backup)
     * ========================================================= */
    function exportFullDB() {
        const DB = window.MediVoidDB || null;
        let data = [];
        if (DB && Array.isArray(DB.db)) data = DB.db.slice();
        // Merge live tests so the backup is complete snapshot
        try {
            const tests = JSON.parse(localStorage.getItem(LS_ADMIN_TEST_KEY) || "[]");
            if (Array.isArray(tests)) {
                tests.forEach(t => { if (!data.find(d => d.id === t.id)) data.push(t); });
            }
        } catch (_) {}
        if (!data.length) {
            showLiveMsg(`<div class="danger-box">DB abhi load nahi hua. 2 sec baad dobara try karo.</div>`, "danger");
            return;
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const d = new Date();
        const stamp = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}_${String(d.getHours()).padStart(2,"0")}${String(d.getMinutes()).padStart(2,"0")}`;
        a.href = url;
        a.download = `medivoid_full_db_backup_${stamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        showLiveMsg(`<div class="info-card"><h3 class="!mb-1">📦 Backup Download Ho Gaya!</h3>
            <p class="text-sm" style="color:var(--color-text-soft)">File: <code>${a.download}</code> · Total <b>${data.length}</b> medicines. Safe location mein rakh lo.</p></div>`, "success");
    }

    /* =========================================================
     * HELPERS
     * ========================================================= */
    function indentEach(str, n) {
        const pad = " ".repeat(n);
        return str.split("\n").map(l => pad + l).join("\n");
    }

})();
