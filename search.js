/**
 * ================================================================
 * search.js
 * Medi Void Search Engine - Pure JavaScript, no AI, no libraries
 * ================================================================
 * Searches through the medicine database using:
 *  1. Symptom detection via keyword map (hinglish/hindi/english)
 *  2. "usedFor" field matching against symptom → medicine targets
 *  3. Direct keyword match against medicine.keywords[]
 *  4. Fuzzy name/category/description matching
 *  5. Weighted scoring to rank results by relevance
 * ================================================================
 */

/**
 * ==========================================================
 * SCORING CONSTANTS
 * ==========================================================
 */
const SCORE = {
    SYMPTOM_MATCH_USED_FOR: 50,       // Hit in usedFor via detected symptom
    KEYWORD_EXACT: 45,                // Exact match in medicine.keywords[]
    NAME_EXACT: 40,                   // Exact name match (e.g. "paracetamol")
    NAME_STARTS_WITH: 30,             // Name starts with query tokens
    NAME_SUBSTRING: 18,               // Name contains query token
    CATEGORY_EXACT: 20,               // Exact category match
    CATEGORY_SUBSTRING: 8,            // Category contains token
    DESC_SUBSTRING: 5,                // Description contains token
    FOOD_MATCH: 2,                    // Token in food instruction
    USEDFOR_DIRECT_HIT: 10,           // Query token is literally in usedFor
    SYMPTOM_EXPANSION_BONUS: 15,      // Detected symptom that's a perfect match
    TYPE_MATCH: 3                     // Matches OTC/Rx preference
};

/**
 * ==========================================================
 * TOKENIZER
 * ==========================================================
 * Splits query into meaningful tokens, removes noise words.
 */
const STOPWORDS = new Set([
    "hai", "hain", "hi", "ho", "hun", "hu", "aa", "aati", "aata", "aaye",
    "raha", "rahi", "rahe", "mein", "me", "mai", "main", "mere", "meri",
    "mujhe", "ko", "ke", "ka", "ki", "ku", "kuch", "koi", "kaun",
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "and", "or", "but", "if", "then",
    "else", "of", "at", "by", "for", "with", "about", "against", "between",
    "into", "through", "during", "before", "after", "above", "below",
    "to", "from", "up", "down", "in", "out", "on", "off", "over", "under",
    "again", "further", "once", "here", "there", "when", "where", "why",
    "how", "all", "each", "few", "more", "most", "other", "some", "such",
    "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very",
    "just", "because", "as", "until", "while", "also",
    "bhi", "aur", "per", "par", "toh", "to", "lekin", "agar", "jaise",
    "kyunki", "ke baad", "ke liye", "abhi", "kal", "aaj", "bahut", "thoda",
    "zyada", "kam", "accha", "theek", "sahi", "galat", "naya", "pura",
    "dard", "dukhi", "pain"  // "dard" stripped so we focus on the body part
]);

function tokenize(query) {
    if (!query) return [];
    // Remove punctuation but keep hindi chars & numbers
    const clean = String(query)
        .toLowerCase()
        .replace(/[।!?,.\n\r\t'"(){}\[\]:;@#$%^&*_=+\-\/\\|<>`~]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (!clean) return [];
    const tokens = clean.split(" ");
    return tokens.filter(t => t && t.length >= 2 && !STOPWORDS.has(t));
}

/**
 * ==========================================================
 * FUZZY MATCHING (Levenshtein for short tokens)
 * ==========================================================
 */
function levenshtein(a, b) {
    if (!a) return b.length;
    if (!b) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function fuzzyScore(token, target) {
    if (!token || !target) return 0;
    const t = token.toLowerCase();
    const T = target.toLowerCase();
    if (T === t) return 1.0;
    if (T.startsWith(t)) return 0.85;
    if (T.includes(t)) return 0.7;
    if (t.length >= 4 && T.length >= 4) {
        const dist = levenshtein(t, T.slice(0, t.length + 2));
        const tolerance = Math.max(1, Math.floor(t.length / 4));
        if (dist <= tolerance) return 0.55 - (dist * 0.1);
    }
    return 0;
}

/**
 * ==========================================================
 * CORE SEARCH FUNCTION
 * ==========================================================
 * @param {string} query - raw user input (hinglish/hindi/english)
 * @param {object} options - { type: "any"|"OTC"|"Prescription", category: string }
 * @returns {Array<{medicine: object, score: number, matchedSymptoms: string[]}>}
 */
function searchMedicines(query, options = {}) {
    const { type = "any", category = null } = options;
    const db = window.MediVoidDB ? window.MediVoidDB.db : [];
    if (!db.length) return [];

    const normalizedQuery = (query || "").toLowerCase().trim();
    if (!normalizedQuery) {
        // If no query, return all (optionally filtered)
        let results = db.slice();
        if (type !== "any") results = results.filter(m => m.type === type);
        if (category) results = results.filter(m => m.category === category);
        return results.map(m => ({ medicine: m, score: 1, matchedSymptoms: [] }))
                      .sort((a, b) => a.medicine.name.localeCompare(b.medicine.name));
    }

    // 1. Detect symptoms using the keyword mapping system
    const detectedSymptoms = window.MediVoidDB
        ? window.MediVoidDB.detectSymptoms(normalizedQuery)
        : [];
    const medicineTargets = window.MediVoidDB
        ? window.MediVoidDB.getMedicineTargets(detectedSymptoms)
        : [];

    // 2. Tokenize remaining query for direct field matching
    const tokens = tokenize(normalizedQuery);

    // 3. Score every medicine
    const scored = [];
    const targetSet = new Set(medicineTargets.map(s => s.toLowerCase()));

    for (const med of db) {
        // Quick filters (type & category) - applied upfront
        if (type !== "any" && med.type !== type) continue;
        if (category && med.category !== category) continue;

        let score = 0;
        const matchedSymptomsSet = new Set();

        // --- A. Symptom system hit via "usedFor" ---
        if (targetSet.size > 0) {
            for (const usedFor of (med.usedFor || [])) {
                const uf = usedFor.toLowerCase();
                if (targetSet.has(uf)) {
                    score += SCORE.SYMPTOM_MATCH_USED_FOR;
                    // Find which symptom produced this
                    for (const sym of detectedSymptoms) {
                        const mapped = (window.MediVoidDB.symptomToMedicineMap[sym] || []).map(x => x.toLowerCase());
                        if (mapped.includes(uf)) matchedSymptomsSet.add(sym);
                    }
                }
            }
        }

        // --- B. Keyword match (brand names, salts, etc.) ---
        if (med.keywords && med.keywords.length) {
            for (const kw of med.keywords) {
                const Kw = String(kw).toLowerCase();
                if (!Kw) continue;
                // Exact against whole query
                if (normalizedQuery === Kw || normalizedQuery.includes(" " + Kw) || normalizedQuery.includes(Kw + " ")) {
                    score += SCORE.KEYWORD_EXACT;
                }
                // Fuzzy against each token
                for (const tk of tokens) {
                    const fz = fuzzyScore(tk, Kw);
                    if (fz > 0) score += Math.max(5, SCORE.KEYWORD_EXACT * fz * 0.6);
                }
            }
        }

        // --- C. Name matching (very high priority) ---
        const nameLow = String(med.name || "").toLowerCase();
        if (nameLow) {
            if (normalizedQuery === nameLow) {
                score += SCORE.NAME_EXACT;
            } else if (nameLow.startsWith(normalizedQuery)) {
                score += SCORE.NAME_STARTS_WITH;
            } else if (nameLow.includes(normalizedQuery)) {
                score += SCORE.NAME_SUBSTRING + 5;
            }
            for (const tk of tokens) {
                if (nameLow === tk) score += SCORE.NAME_EXACT;
                else if (nameLow.startsWith(tk)) score += SCORE.NAME_STARTS_WITH * 0.8;
                else if (nameLow.includes(tk)) score += SCORE.NAME_SUBSTRING;
                else {
                    const fz = fuzzyScore(tk, nameLow.split(" ")[0]);
                    if (fz > 0) score += SCORE.NAME_SUBSTRING * fz;
                }
            }
        }

        // --- D. Category matching ---
        const catLow = String(med.category || "").toLowerCase();
        if (catLow) {
            if (normalizedQuery === catLow) score += SCORE.CATEGORY_EXACT;
            else if (catLow.includes(normalizedQuery)) score += SCORE.CATEGORY_SUBSTRING + 3;
            for (const tk of tokens) {
                if (catLow === tk) score += SCORE.CATEGORY_EXACT;
                else if (catLow.includes(tk)) score += SCORE.CATEGORY_SUBSTRING;
            }
        }

        // --- E. Direct usedFor token hit ---
        for (const usedFor of (med.usedFor || [])) {
            const uf = usedFor.toLowerCase();
            if (normalizedQuery.includes(uf)) {
                score += SCORE.USEDFOR_DIRECT_HIT;
            }
            for (const tk of tokens) {
                if (uf.includes(tk) || tk.includes(uf.slice(0, 4))) {
                    score += SCORE.USEDFOR_DIRECT_HIT * 0.6;
                }
            }
        }

        // --- F. Description (low weight, general text search) ---
        const descLow = String(med.description || "").toLowerCase();
        for (const tk of tokens) {
            if (descLow.includes(tk)) score += SCORE.DESC_SUBSTRING;
        }

        // --- G. Type bonus (only if explicit preference in query) ---
        if (/otc|over.?the.?counter|without.?doctor/.test(normalizedQuery) && med.type === "OTC") {
            score += SCORE.TYPE_MATCH * 3;
        }
        if (/(prescription|doctor.?prescribed|rx|hakeem|dawakhana|sarkari dawa)/.test(normalizedQuery) && med.type === "Prescription") {
            score += SCORE.TYPE_MATCH * 3;
        }

        // Skip zero-score entries unless it's a very short query that matches via symptoms
        if (score <= 0 && detectedSymptoms.length === 0) continue;

        // Extra: slight bonus for OTC (safer default for general info search)
        if (med.type === "OTC") score += 1;

        scored.push({
            medicine: med,
            score,
            matchedSymptoms: Array.from(matchedSymptomsSet)
        });
    }

    // 4. Sort by score DESC, then name ASC
    scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.medicine.name.localeCompare(b.medicine.name);
    });

    return scored;
}

/**
 * ==========================================================
 * SEARCH SUGGESTIONS
 * ==========================================================
 * Generates search suggestion dropdown items from partial query.
 * Mixes: popular searches, symptom names, medicine names.
 * @param {string} query - partial user input
 * @param {number} max - max suggestions to return
 * @returns {Array<{text: string, type: "popular"|"symptom"|"medicine"}>}
 */
function getSuggestions(query, max = 8) {
    const q = (query || "").toLowerCase().trim();
    const results = [];
    const seen = new Set();
    const push = (text, type) => {
        if (!text || seen.has(text.toLowerCase())) return;
        seen.add(text.toLowerCase());
        results.push({ text, type });
    };

    const db = window.MediVoidDB ? window.MediVoidDB.db : [];
    const symptoms = window.MediVoidDB ? Object.keys(window.MediVoidDB.symptomMap) : [];

    if (!q) {
        // Empty query: show popular + example
        if (window.MediVoidDB) {
            for (const s of window.MediVoidDB.popularSearches.slice(0, max)) {
                push(s, "popular");
            }
        }
        return results.slice(0, max);
    }

    // 1. Symptom match
    for (const sym of symptoms) {
        if (sym.toLowerCase().includes(q) ||
            (window.MediVoidDB.symptomMap[sym] || []).some(v => v.toLowerCase().includes(q))) {
            push(sym.charAt(0).toUpperCase() + sym.slice(1), "symptom");
        }
        if (results.length >= max) break;
    }

    // 2. Medicine name match
    for (const med of db) {
        const name = (med.name || "").toLowerCase();
        if (!name) continue;
        if (name.startsWith(q) || name.includes(q)) {
            push(med.name, "medicine");
        }
        if (results.length >= max) break;
    }

    // 3. Keyword match
    for (const med of db) {
        for (const kw of (med.keywords || [])) {
            const Kw = String(kw).toLowerCase();
            if (Kw.startsWith(q) || Kw.includes(q)) {
                push(med.name, "medicine");
                break;
            }
        }
        if (results.length >= max) break;
    }

    // 4. Popular / example as fallback
    if (results.length < max && window.MediVoidDB) {
        for (const s of window.MediVoidDB.popularSearches) {
            if (s.toLowerCase().includes(q)) push(s, "popular");
            if (results.length >= max) break;
        }
    }

    return results.slice(0, max);
}

/**
 * ==========================================================
 * FILTERS
 * ==========================================================
 */

function filterByCategory(results, categoryName) {
    if (!categoryName || categoryName === "All") return results;
    return results.filter(r => r.medicine.category === categoryName);
}

function filterByType(results, type) {
    if (!type || type === "any") return results;
    return results.filter(r => r.medicine.type === type);
}

function groupByCategory(medicines) {
    const groups = {};
    for (const m of medicines) {
        const c = m.category || "Other";
        if (!groups[c]) groups[c] = [];
        groups[c].push(m);
    }
    return groups;
}

/**
 * ==========================================================
 * EXPORT
 * ==========================================================
 */
window.MediVoidSearch = {
    searchMedicines,
    getSuggestions,
    filterByCategory,
    filterByType,
    groupByCategory,
    tokenize,
    fuzzyScore,
    levenshtein
};
