/**
 * ================================================================
 * app.js
 * MediDesk - Application Entry Point & UI Logic
 * ================================================================
 * Handles:
 *   • App initialization & medicine DB load
 *   • Theme (dark mode) toggle + persistence
 *   • Search UX: input, suggestions, recent, clear
 *   • Rendering: cards, categories, A-Z, favorites, detail page
 *   • Favorites + Recent Searches via localStorage
 *   • URL routing: ?id=X for medicine detail, ?q=X for search
 *   • Type/category filters & sorting
 * ================================================================
 */

(function () {
    "use strict";

    /* ----------------------------------------------------------
     * LOCAL STORAGE HELPERS
     * --------------------------------------------------------- */
    const LS = {
        THEME: "medidesk.theme",
        FAVORITES: "medidesk.favorites",
        RECENT: "medidesk.recent"
    };

    function readLS(key, fallback) {
        try {
            const v = localStorage.getItem(key);
            if (v === null) return fallback;
            return JSON.parse(v);
        } catch (_) { return fallback; }
    }

    function writeLS(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); }
        catch (_) {}
    }

    /* ----------------------------------------------------------
     * THEME (DARK MODE)
     * --------------------------------------------------------- */
    function applyTheme(mode) {
        const html = document.documentElement;
        if (mode === "dark") {
            html.classList.add("dark");
        } else {
            html.classList.remove("dark");
        }
        const iconSun = document.getElementById("icon-sun");
        const iconMoon = document.getElementById("icon-moon");
        if (iconSun && iconMoon) {
            if (mode === "dark") {
                iconSun.classList.add("hidden");
                iconMoon.classList.remove("hidden");
            } else {
                iconSun.classList.remove("hidden");
                iconMoon.classList.add("hidden");
            }
        }
    }

    function initTheme() {
        const saved = readLS(LS.THEME, null);
        const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        const mode = saved || (prefersDark ? "dark" : "light");
        applyTheme(mode);

        document.addEventListener("click", (e) => {
            const t = e.target.closest("#theme-toggle");
            if (!t) return;
            e.preventDefault();
            const isDark = document.documentElement.classList.contains("dark");
            const next = isDark ? "light" : "dark";
            applyTheme(next);
            writeLS(LS.THEME, next);
        });
    }

    /* ----------------------------------------------------------
     * NAVBAR SCROLL EFFECT & MOBILE MENU
     * --------------------------------------------------------- */
    function initNavbar() {
        const nb = document.getElementById("navbar");
        if (!nb) return;
        const onScroll = () => {
            if (window.scrollY > 8) nb.classList.add("scrolled");
            else nb.classList.remove("scrolled");
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });

        const btn = document.getElementById("mobile-menu-btn");
        const menu = document.getElementById("mobile-menu");
        if (btn && menu && menu.children.length === 0) {
            // Populate the mobile menu the first time we see it (works on every page)
            const links = [
                { href: "index.html",      label: "🏠 Home" },
                { href: "categories.html", label: "🗂 Categories" },
                { href: "az-list.html",    label: "🔤 A–Z List" },
                { href: "favorites.html",  label: "❤️ Favorites" },
                { href: "disclaimer.html", label: "⚠️ Disclaimer" }
            ];
            links.forEach(l => {
                const a = document.createElement("a");
                a.href = l.href;
                a.className = "px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-bg)] hover:text-[var(--color-primary)] transition-colors";
                a.style.color = "var(--color-text-soft)";
                a.textContent = l.label;
                menu.appendChild(a);
            });
            // Mobile mini search
            const wrap = document.createElement("div");
            wrap.className = "pt-2";
            const input = document.createElement("input");
            input.type = "text";
            input.placeholder = "Search symptoms (e.g. sir dard)…";
            input.className = "input py-2 text-sm w-full";
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    const q = input.value.trim();
                    if (!q) return;
                    window.location.href = "index.html?q=" + encodeURIComponent(q);
                }
            });
            wrap.appendChild(input);
            menu.appendChild(wrap);
        }
        if (btn && menu) {
            btn.addEventListener("click", () => menu.classList.toggle("hidden"));
            menu.addEventListener("click", (e) => {
                if (e.target.tagName === "A") menu.classList.add("hidden");
            });
        }
    }

    /* ----------------------------------------------------------
     * FAVORITES HELPERS
     * --------------------------------------------------------- */
    function getFavorites() { return new Set(readLS(LS.FAVORITES, [])); }
    function toggleFavorite(id) {
        const set = getFavorites();
        const numId = Number(id);
        if (set.has(numId)) set.delete(numId); else set.add(numId);
        writeLS(LS.FAVORITES, Array.from(set));
        return set.has(numId);
    }
    function isFavorite(id) { return getFavorites().has(Number(id)); }

    function updateFavCount() {
        const badge = document.getElementById("fav-count");
        if (!badge) return;
        const n = getFavorites().size;
        if (n > 0) { badge.classList.remove("hidden"); badge.textContent = String(n); }
        else badge.classList.add("hidden");
    }

    /* ----------------------------------------------------------
     * RECENT SEARCHES HELPERS
     * --------------------------------------------------------- */
    function getRecent() { return readLS(LS.RECENT, []); }
    function pushRecent(q) {
        q = (q || "").trim();
        if (!q) return;
        let arr = getRecent();
        arr = arr.filter(x => x.toLowerCase() !== q.toLowerCase());
        arr.unshift(q);
        if (arr.length > 12) arr.length = 12;
        writeLS(LS.RECENT, arr);
    }
    function clearRecent() { writeLS(LS.RECENT, []); }

    /* ----------------------------------------------------------
     * ICONS (inline SVG helper builders)
     * --------------------------------------------------------- */
    function foodIcon(kind) {
        // Returns emoji + text for a food instruction
        switch (String(kind || "").toLowerCase()) {
            case "before food": return "🍽️ Before food";
            case "after food":  return "🍽️ After food";
            case "either":       return "🍽️ Either before or after";
            case "topical":      return "🧴 Topical only — not for eating";
            case "ophthalmic use only":
            case "intranasal use only":
            case "otic use only":
            case "mucosal only":
            case "n/a (parenteral/transmucosal/transdermal)":
            case "n/a (parenteral/transmucosal/transdermal)":  return "💉 Not oral — see usage";
            default: return "🍽️ " + (kind || "—");
        }
    }

    function imageEmojiFor(type) {
        const t = String(type || "").toLowerCase();
        if (t.includes("injection")) return "💉";
        if (t.includes("solution") || t.includes("suspension") || t.includes("syrup")) return "🧪";
        if (t.includes("lotion")) return "🧴";
        if (t.includes("cream") || t.includes("ointment") || t.includes("gel")) return "🩹";
        if (t.includes("sachet")) return "📦";
        if (t.includes("drops") || t.includes("spray")) return "💧";
        if (t.includes("chewable")) return "🍬";
        if (t.includes("capsule")) return "💊";
        if (t.includes("tablet") || t.includes("pill") || t === "pill") return "💊";
        return "💊";
    }

    /* ----------------------------------------------------------
     * SYMPTOM ICONS (for result cards header)
     * --------------------------------------------------------- */
    const symptomEmoji = {
        "headache": "🤕", "fever": "🤒", "cold": "🥶", "cough": "😷",
        "sore throat": "🗣️", "stomach pain": "🫃", "vomiting": "🤮", "diarrhea": "💩",
        "toothache": "🦷", "ear pain": "👂", "eye pain": "👁️", "back pain": "🦴",
        "muscle pain": "💪", "body pain": "🫀", "joint pain": "🦵", "acidity": "🔥",
        "gas": "💨", "allergy": "🤧", "acne": "🧏", "indigestion": "🫄",
        "chest pain": "❤️‍🔥", "high blood pressure": "💓", "low blood pressure": "💔",
        "diabetes": "🍬", "high cholesterol": "🧈", "thyroid": "🦋",
        "depression": "😞", "anxiety": "😟", "insomnia": "🌙",
        "period pain": "🩸", "uti": "🚽"
    };

    /* ----------------------------------------------------------
     * RENDER: MEDICINE CARD
     * --------------------------------------------------------- */
    function renderMedicineCard(med, { matchedSymptoms = [] } = {}) {
        const fav = isFavorite(med.id);
        const otc = (med.type || "OTC").toUpperCase() === "OTC";
        const badge = otc
            ? `<span class="badge badge-otc">🟢 OTC</span>`
            : `<span class="badge badge-rx">📋 Prescription</span>`;

        const symptomsBadges = (matchedSymptoms && matchedSymptoms.length)
            ? matchedSymptoms.slice(0, 2).map(s => {
                const e = symptomEmoji[s] || "✨";
                return `<span class="tag" title="Matched symptom: ${s}">${e} ${s.charAt(0).toUpperCase() + s.slice(1)}</span>`;
            }).join("")
            : "";

        const usedForTags = (med.usedFor || []).slice(0, 4).map(u => `<span class="tag">${u}</span>`).join("");

        const img = imageEmojiFor(med.image || med.category);

        const card = document.createElement("article");
        card.className = "card med-card animate-fade-up";
        card.innerHTML = `
            <button class="fav-btn ${fav ? "active" : ""}" data-id="${med.id}" aria-label="Toggle favorite">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                     fill="${fav ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
            </button>
            <div class="flex items-start gap-3">
                <div class="med-icon">${img}</div>
                <div class="min-w-0 flex-1 pr-6">
                    <h3 class="font-bold text-base leading-snug mb-1.5 pr-2" style="color: var(--color-text);">
                        ${escapeHtml(med.name)}
                    </h3>
                    <div class="text-xs font-semibold mb-2" style="color: var(--color-text-muted);">
                        ${escapeHtml(med.category || "General")}
                    </div>
                    <p class="text-sm mb-2 line-clamp-2" style="color: var(--color-text-soft);">
                        ${escapeHtml(med.description || "")}
                    </p>
                </div>
            </div>

            <div>
                <div class="text-xs font-semibold uppercase tracking-wider mb-1.5" style="color: var(--color-text-muted);">
                    Used for
                </div>
                <div class="-m-0.5">${usedForTags}</div>
                ${symptomsBadges ? `<div class="mt-1.5">${symptomsBadges}</div>` : ""}
            </div>

            <div class="flex items-center gap-2 text-sm" style="color: var(--color-text-soft);">
                <span class="shrink-0">🍽️</span>
                <span class="truncate">${escapeHtml(foodIcon(med.food))}</span>
            </div>

            <div class="flex items-center justify-between gap-2 mt-auto pt-1">
                ${badge}
                <a href="medicine.html?id=${encodeURIComponent(med.id)}"
                   class="btn btn-primary btn-sm">
                    View Details
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                    </svg>
                </a>
            </div>
        `;

        // Favorite button handler
        card.querySelector(".fav-btn").addEventListener("click", (e) => {
            e.preventDefault();
            const now = toggleFavorite(med.id);
            const btn = e.currentTarget;
            btn.classList.toggle("active", now);
            const svg = btn.querySelector("svg");
            if (svg) svg.setAttribute("fill", now ? "currentColor" : "none");
            updateFavCount();
            renderFavoritesGrid();
        });

        return card;
    }

    /* ----------------------------------------------------------
     * ESCAPE HTML
     * --------------------------------------------------------- */
    function escapeHtml(s) {
        s = String(s == null ? "" : s);
        return s
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /* ==============================================================
     * ==============================================================
     *   HOME PAGE LOGIC
     * ==============================================================
     * ============================================================== */

    function isHomePage() {
        return !!document.getElementById("results-grid");
    }

    /* ----------- Home page state ------------- */
    const PAGE_SIZE = 6;
    const homeState = {
        query: "",
        typeFilter: "any",
        categoryFilter: null,
        sort: "relevance",
        _currentResults: [],  // scored results
        _visible: 0           // how many cards shown (multiples of PAGE_SIZE)
    };

    function renderHomeChips() {
        const DB = window.MediDeskDB;
        if (!DB) return;

        // Example chips
        const exWrap = document.getElementById("example-chips");
        if (exWrap) {
            exWrap.innerHTML = "";
            DB.exampleSearches.forEach(q => {
                const c = document.createElement("button");
                c.type = "button";
                c.className = "chip";
                c.innerHTML = `"${escapeHtml(q)}"`;
                c.addEventListener("click", () => runSearch(q, true));
                exWrap.appendChild(c);
            });
        }

        // Popular chips
        const popWrap = document.getElementById("popular-chips");
        if (popWrap) {
            popWrap.innerHTML = "";
            DB.popularSearches.forEach(q => {
                const c = document.createElement("button");
                c.type = "button";
                c.className = "chip";
                c.textContent = q;
                c.addEventListener("click", () => runSearch(q, true));
                popWrap.appendChild(c);
            });
        }

        renderRecentChips();
    }

    function renderRecentChips() {
        const wrap = document.getElementById("recent-wrap");
        const chips = document.getElementById("recent-chips");
        if (!wrap || !chips) return;
        const arr = getRecent();
        if (!arr.length) { wrap.classList.add("hidden"); return; }
        wrap.classList.remove("hidden");
        chips.innerHTML = "";
        arr.forEach(q => {
            const c = document.createElement("button");
            c.type = "button";
            c.className = "chip";
            c.textContent = q;
            c.addEventListener("click", () => runSearch(q, true));
            chips.appendChild(c);
        });
    }

    function renderCategories() {
        const DB = window.MediDeskDB;
        const grid = document.getElementById("categories-grid");
        if (!DB || !grid) return;

        const counts = {};
        for (const m of DB.db) counts[m.category] = (counts[m.category] || 0) + 1;
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

        const icons = ["💊","💉","🩺","🧴","🧪","❤️‍🩹","🫁","🧠","🦴","🩸","🌿","🌡️","👁️","🦷","🫀","🤒","🤕","🩹","🧬","⚗️"];

        grid.innerHTML = "";
        sorted.forEach(([cat, n], i) => {
            const card = document.createElement("button");
            card.type = "button";
            card.className = "card p-4 text-left hover:border-[var(--color-primary-light)] transition-all animate-fade-up";
            card.style.animationDelay = (i * 30) + "ms";
            card.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <div class="w-10 h-10 rounded-lg flex items-center justify-center text-2xl"
                         style="background: var(--color-primary-bg); color: var(--color-primary);">
                        ${icons[i % icons.length]}
                    </div>
                    <span class="badge badge-primary">${n} item${n===1?"":"s"}</span>
                </div>
                <div class="font-bold leading-snug" style="color: var(--color-text);">${escapeHtml(cat)}</div>
                <div class="text-xs mt-1" style="color: var(--color-text-muted);">Tap to browse</div>
            `;
            card.addEventListener("click", () => {
                homeState.categoryFilter = homeState.categoryFilter === cat ? null : cat;
                updateCategoryChipsFromState();
                applyFiltersAndRender();
                document.getElementById("results-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
            grid.appendChild(card);
        });
    }

    function buildCategoryFilterChips() {
        const DB = window.MediDeskDB;
        const box = document.getElementById("category-filter");
        if (!DB || !box) return;
        box.innerHTML = "";

        const cats = DB.getAllCategories();
        // Visible limit: All + first 3 categories (4 chips visible by default)
        const VISIBLE_LIMIT = 3;

        // All chip (always visible)
        const all = document.createElement("button");
        all.type = "button";
        all.className = "chip chip-filter category-filter active";
        all.dataset.cat = "All";
        all.textContent = "All";
        all.addEventListener("click", () => {
            homeState.categoryFilter = null;
            updateCategoryChipsFromState();
            applyFiltersAndRender();
        });
        box.appendChild(all);

        // If 3 or fewer categories: no collapse needed
        if (cats.length <= VISIBLE_LIMIT) {
            cats.forEach(c => box.appendChild(makeCatChip(c)));
            return;
        }

        // First VISIBLE_LIMIT categories: always visible
        const visibleCats = cats.slice(0, VISIBLE_LIMIT);
        const hiddenCats = cats.slice(VISIBLE_LIMIT);

        visibleCats.forEach(c => box.appendChild(makeCatChip(c)));

        // Hidden wrapper for remaining + show-more toggle
        const hiddenWrap = document.createElement("span");
        hiddenWrap.className = "hidden cat-hidden-wrap";
        hiddenCats.forEach(c => hiddenWrap.appendChild(makeCatChip(c)));
        box.appendChild(hiddenWrap);

        // 3-dots / expand toggle button
        const toggleBtn = document.createElement("button");
        toggleBtn.type = "button";
        toggleBtn.className = "chip chip-filter cat-toggle-btn";
        toggleBtn.title = `Show ${hiddenCats.length} more categories`;
        toggleBtn.innerHTML = `⋯<span class="ml-1 text-[10px] opacity-70">+${hiddenCats.length}</span>`;
        toggleBtn.addEventListener("click", () => {
            const isOpen = !hiddenWrap.classList.contains("hidden");
            if (isOpen) {
                hiddenWrap.classList.add("hidden");
                toggleBtn.innerHTML = `⋯<span class="ml-1 text-[10px] opacity-70">+${hiddenCats.length}</span>`;
                toggleBtn.title = `Show ${hiddenCats.length} more categories`;
                toggleBtn.classList.remove("active");
            } else {
                hiddenWrap.classList.remove("hidden");
                toggleBtn.innerHTML = `✕<span class="ml-1 text-[10px] opacity-70">Less</span>`;
                toggleBtn.title = "Hide extra categories";
                toggleBtn.classList.add("active");
            }
        });
        box.appendChild(toggleBtn);

        function makeCatChip(c) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "chip chip-filter category-filter";
            btn.dataset.cat = c;
            btn.textContent = c;
            btn.addEventListener("click", () => {
                homeState.categoryFilter = homeState.categoryFilter === c ? null : c;
                updateCategoryChipsFromState();
                applyFiltersAndRender();
            });
            return btn;
        }
    }

    function updateCategoryChipsFromState() {
        const chips = document.querySelectorAll(".category-filter");
        chips.forEach(c => {
            const isActive = (!homeState.categoryFilter && c.dataset.cat === "All") ||
                              homeState.categoryFilter === c.dataset.cat;
            c.classList.toggle("active", isActive);
        });
    }

    /* ----------- Search results ------------- */
    function runSearch(q, pushRecentFlag = true) {
        const input = document.getElementById("search-input");
        if (input) { input.value = q || ""; }
        homeState.query = (q || "").trim();
        if (pushRecentFlag && homeState.query) pushRecent(homeState.query);
        renderRecentChips();
        hideSuggestions();
        applyFiltersAndRender();
        if (homeState.query) {
            document.getElementById("results-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    function applyFiltersAndRender() {
        const SE = window.MediDeskSearch;
        const DB = window.MediDeskDB;
        const grid = document.getElementById("results-grid");
        const results = document.getElementById("results-section");
        const empty = document.getElementById("no-results");
        const meta = document.getElementById("results-meta");
        const heading = document.getElementById("results-heading");
        const countEl = document.getElementById("results-count");
        if (!SE || !DB || !grid || !results) return;

        // Show results section
        results.classList.remove("hidden");

        let scored = SE.searchMedicines(homeState.query, { type: homeState.typeFilter, category: homeState.categoryFilter });

        // Apply sort (relevance is default from searchMedicines)
        scored = applySort(scored, homeState.sort);

        // Save full results & reset visible window to first page
        homeState._currentResults = scored;
        homeState._visible = Math.min(PAGE_SIZE, scored.length);

        // Render
        grid.innerHTML = "";
        if (scored.length === 0) {
            empty?.classList.remove("hidden");
            countEl.textContent = "0";
            heading.textContent = "results";
            if (meta) meta.textContent = "Try different keywords or remove filters.";
            updateShowMoreBtn(0);
            return;
        }
        empty?.classList.add("hidden");
        countEl.textContent = String(scored.length);
        heading.textContent = scored.length === 1 ? "result" : "results";

        if (meta) {
            const parts = [];
            if (homeState.query) parts.push(`for "${homeState.query}"`);
            if (homeState.categoryFilter) parts.push(`in ${homeState.categoryFilter}`);
            if (homeState.typeFilter !== "any") parts.push(`· ${homeState.typeFilter} only`);
            meta.textContent = parts.join(" ") || "All medicines";
        }

        renderVisibleCards();
        updateShowMoreBtn(scored.length);
    }

    /* Render only the current PAGE of medicine cards into the results grid */
    function renderVisibleCards() {
        const grid = document.getElementById("results-grid");
        if (!grid) return;
        grid.innerHTML = "";
        const scored = homeState._currentResults || [];
        const end = homeState._visible || 0;
        for (let i = 0; i < end && i < scored.length; i++) {
            const r = scored[i];
            const card = renderMedicineCard(r.medicine, { matchedSymptoms: r.matchedSymptoms });
            card.style.animationDelay = Math.min(400, (i % PAGE_SIZE) * 35) + "ms";
            grid.appendChild(card);
        }
    }

    /* Expand the visible window by one PAGE_SIZE and re-render */
    function showMoreCards() {
        const total = (homeState._currentResults || []).length;
        const next = Math.min(total, (homeState._visible || 0) + PAGE_SIZE);
        if (next <= homeState._visible) return;
        homeState._visible = next;
        renderVisibleCards();
        updateShowMoreBtn(total);
    }

    /* Show / hide / update Show More button text based on total vs visible */
    function updateShowMoreBtn(total) {
        const wrap = document.getElementById("show-more-wrap");
        const btn = document.getElementById("show-more-btn");
        if (!wrap || !btn) return;
        if (!total || total <= PAGE_SIZE) {
            wrap.classList.add("hidden");
            return;
        }
        const visible = homeState._visible || 0;
        const remaining = Math.max(0, total - visible);
        if (remaining <= 0) {
            wrap.classList.add("hidden");
            return;
        }
        wrap.classList.remove("hidden");
        const labelSpan = btn.querySelector("span");
        if (labelSpan) {
            labelSpan.textContent = remaining <= PAGE_SIZE
                ? `Show Last ${remaining}`
                : `Show ${PAGE_SIZE} More (${remaining} left)`;
        }
    }

    function applySort(scored, sort) {
        const arr = scored.slice();
        switch (sort) {
            case "name":
                arr.sort((a, b) => a.medicine.name.localeCompare(b.medicine.name)); break;
            case "name-desc":
                arr.sort((a, b) => b.medicine.name.localeCompare(a.medicine.name)); break;
            case "otc-first":
                arr.sort((a, b) => {
                    const ra = a.medicine.type === "OTC" ? 0 : 1;
                    const rb = b.medicine.type === "OTC" ? 0 : 1;
                    if (ra !== rb) return ra - rb;
                    return b.score - a.score;
                });
                break;
            case "rx-first":
                arr.sort((a, b) => {
                    const ra = a.medicine.type === "Prescription" ? 0 : 1;
                    const rb = b.medicine.type === "Prescription" ? 0 : 1;
                    if (ra !== rb) return ra - rb;
                    return b.score - a.score;
                });
                break;
            case "relevance":
            default:
                // Already sorted by relevance
                break;
        }
        return arr;
    }

    /* ----------- Suggestions ------------- */
    let suggestionActiveIdx = -1;
    let suggestionItems = [];

    function showSuggestions() {
        const box = document.getElementById("search-suggestions");
        if (box) {
            box.classList.remove("hidden");
            requestAnimationFrame(() => box.classList.add("open"));
        }
    }
    function hideSuggestions() {
        const box = document.getElementById("search-suggestions");
        if (box) {
            box.classList.remove("open");
            setTimeout(() => box.classList.add("hidden"), 150);
        }
        suggestionActiveIdx = -1;
    }

    function renderSuggestions(list) {
        const box = document.getElementById("search-suggestions");
        if (!box) return;
        if (!list || !list.length) { hideSuggestions(); return; }
        box.innerHTML = "";
        suggestionItems = list.slice();
        list.forEach((s, i) => {
            const el = document.createElement("div");
            el.className = "suggestion-item" + (i === suggestionActiveIdx ? " active" : "");
            el.dataset.idx = String(i);
            const ico = s.type === "popular" ? "🔥" : s.type === "medicine" ? "💊" : "🔍";
            el.innerHTML = `
                <div class="suggestion-icon">${ico}</div>
                <div class="flex-1 min-w-0">
                    <div class="font-medium truncate" style="color: var(--color-text);">${escapeHtml(s.text)}</div>
                    <div class="text-xs" style="color: var(--color-text-muted);">
                        ${s.type === "popular" ? "Popular search" : s.type === "symptom" ? "Symptom" : "Medicine name"}
                    </div>
                </div>
            `;
            el.addEventListener("mousedown", (e) => {
                e.preventDefault();
                runSearch(s.text, true);
            });
            el.addEventListener("mouseenter", () => {
                suggestionActiveIdx = i;
                updateSuggestionActive();
            });
            box.appendChild(el);
        });
        showSuggestions();
    }

    function updateSuggestionActive() {
        document.querySelectorAll(".suggestion-item").forEach((el, i) => {
            el.classList.toggle("active", i === suggestionActiveIdx);
        });
    }

    function initSearchInput() {
        const input = document.getElementById("search-input");
        const btn = document.getElementById("search-btn");
        const clear = document.getElementById("clear-search");
        const navSearch = document.getElementById("nav-search");
        if (!input) return;

        const onInput = () => {
            const v = input.value;
            if (clear) clear.classList.toggle("hidden", !v);
            const SE = window.MediDeskSearch;
            if (!SE) return;
            const list = SE.getSuggestions(v, 8);
            suggestionActiveIdx = -1;
            renderSuggestions(list);
        };
        input.addEventListener("input", onInput);
        input.addEventListener("focus", onInput);
        input.addEventListener("blur", () => setTimeout(hideSuggestions, 180));

        input.addEventListener("keydown", (e) => {
            if (e.key === "ArrowDown") {
                if (!suggestionItems.length) return;
                e.preventDefault();
                suggestionActiveIdx = (suggestionActiveIdx + 1) % suggestionItems.length;
                updateSuggestionActive();
            } else if (e.key === "ArrowUp") {
                if (!suggestionItems.length) return;
                e.preventDefault();
                suggestionActiveIdx = suggestionActiveIdx <= 0 ? suggestionItems.length - 1 : suggestionActiveIdx - 1;
                updateSuggestionActive();
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (suggestionActiveIdx >= 0 && suggestionItems[suggestionActiveIdx]) {
                    runSearch(suggestionItems[suggestionActiveIdx].text, true);
                } else {
                    runSearch(input.value, true);
                }
            } else if (e.key === "Escape") {
                hideSuggestions();
                input.blur();
            }
        });

        btn?.addEventListener("click", () => runSearch(input.value, true));
        clear?.addEventListener("click", () => {
            input.value = "";
            homeState.query = "";
            clear.classList.add("hidden");
            input.focus();
            onInput();
            applyFiltersAndRender();
        });

        // Quick nav-search (top-right on desktop)
        navSearch?.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                const q = navSearch.value.trim();
                if (!q) return;
                runSearch(q, true);
                document.getElementById("home")?.scrollIntoView({ behavior: "smooth" });
            }
        });

        // Recent clear button
        document.getElementById("clear-recent")?.addEventListener("click", () => {
            clearRecent();
            renderRecentChips();
        });
    }

    function initFiltersAndSort() {
        document.querySelectorAll(".type-filter").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".type-filter").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                homeState.typeFilter = btn.dataset.type || "any";
                applyFiltersAndRender();
            });
        });
        const sortSel = document.getElementById("sort-select");
        sortSel?.addEventListener("change", () => {
            homeState.sort = sortSel.value || "relevance";
            applyFiltersAndRender();
        });
        const showMoreBtn = document.getElementById("show-more-btn");
        showMoreBtn?.addEventListener("click", () => {
            showMoreCards();
        });
    }

    /* ----------- A-Z index ------------- */
    function renderAZ() {
        const DB = window.MediDeskDB;
        const lettersBox = document.getElementById("alpha-letters");
        const sectionsBox = document.getElementById("alpha-sections");
        const filterInput = document.getElementById("alpha-search");
        if (!DB || !lettersBox || !sectionsBox) return;

        function draw(filter = "") {
            let all = DB.getAllMedicinesSorted();
            if (filter) {
                const f = filter.toLowerCase();
                all = all.filter(m => m.name.toLowerCase().includes(f) ||
                                      (m.keywords || []).some(k => k.toLowerCase().includes(f)));
            }

            const groups = {};
            all.forEach(m => {
                const l = m.name.charAt(0).toUpperCase();
                if (!groups[l]) groups[l] = [];
                groups[l].push(m);
            });

            // Letters
            lettersBox.innerHTML = "";
            const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
            alphabet.forEach(l => {
                const a = document.createElement("a");
                const has = !!(groups[l] && groups[l].length);
                a.href = "#alpha-" + l;
                a.textContent = l;
                if (!has) a.classList.add("empty");
                lettersBox.appendChild(a);
            });

            // Sections
            sectionsBox.innerHTML = "";
            const letters = Object.keys(groups).sort();
            if (!letters.length) {
                sectionsBox.innerHTML = `<div class="card p-6 text-center" style="color: var(--color-text-muted);">No matches for "${escapeHtml(filter)}"</div>`;
                return;
            }
            letters.forEach(l => {
                const h2 = document.createElement("h2");
                h2.id = "alpha-" + l;
                h2.innerHTML = `<span>${l}</span><span style="font-size: 0.75em; opacity: 0.7;">· ${groups[l].length}</span>`;
                sectionsBox.appendChild(h2);
                const ul = document.createElement("div");
                ul.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4";
                groups[l].forEach((med, i) => {
                    const card = renderMedicineCard(med);
                    card.style.animationDelay = Math.min(400, i * 20) + "ms";
                    ul.appendChild(card);
                });
                sectionsBox.appendChild(ul);
            });
        }

        draw();
        filterInput?.addEventListener("input", () => draw(filterInput.value));
    }

    /* ----------- Favorites grid (home page section) ------------- */
    function renderFavoritesGrid() {
        const DB = window.MediDeskDB;
        const grid = document.getElementById("favorites-grid");
        const empty = document.getElementById("favorites-empty");
        if (!DB || !grid) return;

        const favIds = getFavorites();
        const meds = DB.db.filter(m => favIds.has(Number(m.id)));

        grid.innerHTML = "";
        if (!meds.length) {
            empty?.classList.remove("hidden");
            return;
        }
        empty?.classList.add("hidden");
        meds.forEach((med, i) => {
            const card = renderMedicineCard(med);
            card.style.animationDelay = Math.min(400, i * 40) + "ms";
            grid.appendChild(card);
        });
    }

    /* ==============================================================
     * ==============================================================
     *   DETAIL PAGE LOGIC
     * ==============================================================
     * ============================================================== */

    function isDetailPage() {
        return !!document.getElementById("detail-content");
    }

    function getQueryParam(name) {
        try {
            const p = new URLSearchParams(window.location.search);
            return p.get(name);
        } catch (_) {
            // IE fallback for file:// URLs without search params support
            const m = new RegExp("[?&]" + name + "=([^&#]*)").exec(window.location.href);
            return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : null;
        }
    }

    function renderDetail() {
        const DB = window.MediDeskDB;
        if (!DB || !isDetailPage()) return;

        const loading = document.getElementById("loading");
        const nf = document.getElementById("not-found");
        const content = document.getElementById("detail-content");
        const id = getQueryParam("id");
        if (loading) loading.classList.add("hidden");

        const med = id ? DB.getMedicineById(id) : null;
        if (!med) {
            nf?.classList.remove("hidden");
            return;
        }
        content?.classList.remove("hidden");
        document.title = `${med.name} — MediDesk Details`;

        // Populate basic
        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text == null ? "" : String(text);
        };
        const setHtml = (id, html) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = html;
        };
        const listFromArray = (containerId, arr, empty = "—") => {
            const el = document.getElementById(containerId);
            if (!el) return;
            el.innerHTML = "";
            if (!arr || !arr.length) {
                const li = document.createElement("li");
                li.textContent = empty;
                el.appendChild(li);
                return;
            }
            arr.forEach(it => {
                const li = document.createElement("li");
                li.textContent = it;
                el.appendChild(li);
            });
        };

        setText("detail-name", med.name);
        setText("detail-desc", med.description);
        setText("detail-desc-long", med.description);
        setText("detail-category", med.category || "General");
        setText("detail-food", foodIcon(med.food));
        setText("detail-food-long", foodIcon(med.food) + ". " +
            (med.food === "Before food" ? "Take on an empty stomach before meals." :
             med.food === "After food"  ? "Take after eating to reduce stomach upset." :
             med.food === "Either"      ? "May be taken with or without food, as convenient." :
             med.food || "Refer to product label."));
        setText("detail-typical", med.typicalUse || "—");
        setText("detail-storage", med.storage || "Store at room temperature.");
        setText("detail-warning", med.warning || "Read package leaflet before use.");
        setText("detail-usedfor-short", (med.usedFor || []).slice(0, 3).join(", ") || "—");

        // Type badge
        const typeEl = document.getElementById("detail-type");
        if (typeEl) {
            const isOTC = (med.type || "OTC").toUpperCase() === "OTC";
            typeEl.className = "badge " + (isOTC ? "badge-otc" : "badge-rx");
            typeEl.innerHTML = isOTC ? "🟢 OTC · Over the Counter" : "📋 Prescription · HCP Required";
        }

        // Lists
        listFromArray("detail-usedfor", med.usedFor);
        listFromArray("detail-commonuses", med.usedFor);
        listFromArray("detail-sideeffects", med.sideEffects);
        listFromArray("detail-avoidif", med.avoidIf);

        // Detail image
        const img = document.getElementById("detail-image");
        if (img) img.textContent = imageEmojiFor(med.image || med.category);

        // Favorite
        const favBtn = document.getElementById("detail-fav");
        const favText = document.getElementById("detail-fav-text");
        const refreshFav = () => {
            if (!favBtn || !favText) return;
            const isF = isFavorite(med.id);
            favText.textContent = isF ? "Remove from favorites" : "Add to favorites";
            favBtn.style.background = isF ? "var(--color-danger-bg)" : "var(--color-danger-bg)";
            favBtn.style.color = "var(--color-danger)";
            const svg = favBtn.querySelector("svg");
            if (svg) svg.setAttribute("fill", isF ? "currentColor" : "none");
        };
        refreshFav();
        favBtn?.addEventListener("click", (e) => {
            e.preventDefault();
            toggleFavorite(med.id);
            refreshFav();
            updateFavCount();
            renderFavoritesGrid();
        });

        // Related medicines: same category (excluding self), max 4
        const relGrid = document.getElementById("related-grid");
        if (relGrid) {
            const related = DB.db.filter(m =>
                m.id !== med.id && (
                    m.category === med.category ||
                    (m.usedFor || []).some(u => (med.usedFor || []).includes(u))
                )
            ).slice(0, 4);
            relGrid.innerHTML = "";
            if (related.length) {
                related.forEach((rm, i) => {
                    const card = renderMedicineCard(rm);
                    card.style.animationDelay = (i * 60) + "ms";
                    relGrid.appendChild(card);
                });
            } else {
                relGrid.innerHTML = `<div class="col-span-full card p-6 text-center" style="color: var(--color-text-muted);">No related medicines to display.</div>`;
            }
        }
    }

    /* ----------------------------------------------------------
     * APP INIT
     * --------------------------------------------------------- */
    async function initApp() {
        // Year in footer
        const y = document.getElementById("year");
        if (y) y.textContent = new Date().getFullYear();

        initTheme();
        initNavbar();
        updateFavCount();

        try {
            await window.MediDeskDB.loadMedicines();
        } catch (e) {
            console.error("Failed to load medicines", e);
        }

        /* ----- Pages with full search UI (home page) ----- */
        if (isHomePage()) {
            buildCategoryFilterChips();
            renderHomeChips();
            initSearchInput();
            initFiltersAndSort();
            applyFiltersAndRender();

            // Support ?q= parameter for direct search link
            const q = getQueryParam("q");
            if (q) {
                const input = document.getElementById("search-input");
                if (input) input.value = q;
                runSearch(q, true);
            }
        }

        /* ----- Render sections wherever their containers exist (works on ANY page) ----- */
        if (document.getElementById("categories-grid")) renderCategories();
        if (document.getElementById("alpha-letters") && document.getElementById("alpha-sections")) renderAZ();
        if (document.getElementById("favorites-grid")) renderFavoritesGrid();

        /* ----- Global header quick-search (on every page that has nav-search) ----- */
        const ns = document.getElementById("nav-search");
        if (ns) {
            ns.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    const q = ns.value.trim();
                    if (!q) return;
                    window.location.href = "index.html?q=" + encodeURIComponent(q);
                }
            });
        }

        /* ----- Detail page ----- */
        if (isDetailPage()) {
            renderDetail();
        }
    }

    /* ----------------------------------------------------------
     * APP INIT (single-guarded)
     * --------------------------------------------------------- */
    let _appInited = false;
    async function safeInitApp() {
        if (_appInited) return;
        _appInited = true;
        try { await initApp(); }
        catch (err) { console.error("MediDesk init error", err); }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", safeInitApp);
    } else {
        // Already interactive/complete - no DOMContentLoaded will fire
        safeInitApp();
    }
})();
