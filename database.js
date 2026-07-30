/**
 * ================================================================
 * database.js
 * Symptom Keyword Mapping System & Medicine Database Handler
 * ================================================================
 * Supports intelligent detection of symptoms in Hinglish, Hindi,
 * and English without using any AI or external APIs.
 * Uses a simple but robust keyword mapping + fuzzy matching approach.
 * ================================================================
 */

/* ================================================================
 * SYMPTOM KEYWORD MAPPING
 * Maps multiple variations of a symptom name (Hindi/Hinglish/English)
 * to a standardized, searchable symptom category.
 * ================================================================ */

const symptomMap = {
    /* ---------- HEADACHE ---------- */
    "headache": ["headache", "sir dard", "sir me dard", "sar dard", "sar me dard",
        "head pain", "sir dukhna", "sar dukhna", "sir dukh raha", "sar dukh raha",
        "sirdard", "headache hai", "migraine", "half headache", "adha sir dard",
        "severe headache", "tej sir dard", "chronic headache", "sir me dard hai",
        "sar me dard hai", "head ka dard", "sir ka dard", "sar ka dard",
        "sir pe dard", "sar pe dard", "heavy head", "bhaari sir"],

    /* ---------- FEVER ---------- */
    "fever": ["fever", "bukhar", "bukhaar", "tabiyat garam", "body garam",
        "tezz bukhar", "high fever", "fever aa raha", "bukhar aa raha",
        "bukhar hai", "fever hai", "temperature high", "teep", "tez bukhar",
        "mujhe bukhar", "user ko bukhar", "thand lag rahi", "chills",
        "shivering with fever", "kap kap kapdi", "kapkapi", "bukhar ke sath thand"],

    /* ---------- COLD / BLOCKED NOSE ---------- */
    "cold": ["cold", "thand lagi", "thand lag rahi", "sardi", "jukaam",
        "blocked nose", "naak band", "nak band", "nose block", "running nose",
        "naak beh rahi", "nak beh rahi", "naak behna", "sneezing", "chhenk",
        "chheenk", "chhenkein aa rahi", "chheenkna", "sardi jukaam",
        "head cold", "common cold", "nose stuffed", "congestion"],

    /* ---------- COUGH ---------- */
    "cough": ["cough", "khansi", "khasi", "khaansi", "khaasi", "khansi aa rahi",
        "khasi aa rahi", "gale ki khansi", "balgam", "balgam wali khansi",
        "wet cough", "dry cough", "sukhi khansi", "geeli khansi", "thandi ki khansi",
        "coughing", "khansi badi", "khansi se pareshan", "khansi hai",
        "raat ko khansi", "din ko khansi", "balgum", "khustarvaan khansi"],

    /* ---------- SORE THROAT ---------- */
    "sore throat": ["sore throat", "gala kharab", "gala dard", "gale me dard",
        "gala kharab hai", "gale me jalan", "throat pain", "throat infection",
        "gal dard", "gale ki kharish", "khujli gala", "tonsils", "tonsillitis",
        "gale me sujan", "gala baithna", "gale me balgam", "difficulty swallowing",
        "nigalne me dard"],

    /* ---------- STOMACH PAIN / ABDOMINAL PAIN ---------- */
    "stomach pain": ["stomach pain", "pet dard", "pet me dard", "paet dard",
        "paet me dard", "abdomen pain", "abdominal pain", "pet ka dard",
        "pet me dard hai", "pait dard", "pait me dard", "pet dukhna",
        "stomach ache", "tummy pain", "pet me sujan", "gas ki wajah se pet dard",
        "acid ki wajah se pet dard", "pet me tez dard"],

    /* ---------- VOMITING / NAUSEA ---------- */
    "vomiting": ["vomiting", "ulti", "ullti", "ulti aa rahi", "ulti aa rahi hai",
        "vomit", "nausea", "matli", "chakkar", "chakkar aa raha",
        "user ko ulti", "mujhe ulti", "pet ulatna", "feeling like vomiting",
        "qayamat lagna", "qayamat", "ultiya", "bukhar ke sath ulti",
        "sir dard ke sath ulti", "sehat ulti"],

    /* ---------- DIARRHEA / LOOSE MOTIONS ---------- */
    "diarrhea": ["diarrhea", "diarrhoea", "loose motions", "dast", "patli daal",
        "patli potty", "loose stool", "patli khana nikalna", "kabji nahi ulta",
        "watering stool", "dast lagna", "pet saaf nahi hota", "frequent stool",
        "khana digest nahi ho raha", "stomach upset", "upset stomach",
        "acute diarrhea", "loose motion hai", "dast hai"],

    /* ---------- TOOTHACHE ---------- */
    "toothache": ["toothache", "tooth pain", "daant dard", "daant me dard",
        "dant dard", "dant me dard", "daant ka dard", "dant ka dard",
        "daant me dard hai", "dant me dard hai", "toothache hai",
        "daant dukh raha", "dant dukh raha", "teeth pain", "kide daant",
        "cavity pain", "daant me kid", "sensitivity teeth", "dard khata hua daant"],

    /* ---------- EAR PAIN ---------- */
    "ear pain": ["ear pain", "kaan dard", "kaan me dard", "kan dard",
        "kan me dard", "ear ache", "kan sukhna", "kaan bhara bhara lagna",
        "kannu dard", "otitis", "ear infection", "kan me jalan",
        "kaano me dard", "bees din ka dard ear", "ear block", "kaan band"],

    /* ---------- EYE PAIN / EYE IRRITATION ---------- */
    "eye pain": ["eye pain", "aankh dard", "aankh me dard", "ankh dard",
        "ankh me dard", "aankhon me dard", "eye strain", "computer eyes",
        "dry eyes", "aankhe sukhna", "aankh lal", "red eyes", "aankh me jalan",
        "aankh me khujli", "itching eyes", "conjunctivitis", "aankh me sujan",
        "swelling in eye", "aankh me kuch chala gaya", "foreign body eye"],

    /* ---------- BACK PAIN ---------- */
    "back pain": ["back pain", "peeth dard", "peeth me dard", "pith dard",
        "pith me dard", "lower back pain", "kamr dard", "kamar dard",
        "kamar me dard", "kamr me dard", "waist pain", "spine pain",
        "backache", "peeth ka dard", "kamar ka dard", "dard kamr",
        "peeth sujan", "lumbar pain", "sciatica", "rha ki dard"],

    /* ---------- MUSCLE PAIN ---------- */
    "muscle pain": ["muscle pain", "maspeshiyo me dard", "body ache muscles",
        "muscle strain", "pulled muscle", "maspeshi dard", "manspeshiyo ka dard",
        "muscle fatigue", "exercise pain", "gale ki maspeshi", "dard kiya",
        "muscle injury", "muscle stiffness", "stiff muscles", "maspeshiyo me sujan"],

    /* ---------- BODY PAIN / GENERAL ACHES ---------- */
    "body pain": ["body pain", "body ache", "pura dard", "sarir dard",
        "sari body me dard", "sarir me dard", "poore sharir me dard",
        "general body ache", "weakness with pain", "bukhar ke sath body pain",
        "flu body pain", "pura body pain", "sharir ka dard", "body me pain",
        "fatigue pain", "thakaan ke sath dard"],

    /* ---------- JOINT PAIN / ARTHRITIS ---------- */
    "joint pain": ["joint pain", "jor ka dard", "joints me dard", "jodo ka dard",
        "arthritis", "rheumatoid", "osteoarthritis", "sandhivata", "sandhi dard",
        "knee pain", "ghutne ka dard", "ghutne me dard", "kamar joint pain",
        "hath joint dard", "pain in joints", "joint swelling", "joint inflammation",
        "jodon me sujan", "jodo me jalan", "old age joint pain"],

    /* ---------- ACIDITY / HEARTBURN ---------- */
    "acidity": ["acidity", "tezab", "tezabiyat", "amlapitta", "amlapitta hai",
        "heartburn", "chhati me jalan", "chest burning", "pachan dosh",
        "acid reflux", "pet me jalan", "stomach burning", "gale me acid",
        "tezaab", "gastro", "GERD", "acidity problem", "amla",
        "chhati ki jalan", "acidity hai mujhe"],

    /* ---------- GAS / BLOATING ---------- */
    "gas": ["gas", "gas problem", "pet me gas", "pet bhar bhar lagra",
        "abdomen bloat", "bloating", "pet foolna", "pet fool gaya",
        "stomach gas", "flatulence", "gas ban raha", "gas pass",
        "pet me dard gas", "pet bhara bhara", "air in stomach", "pet me hava",
        "bad digestion gas", "gas after food", "khana khane ke baad gas"],

    /* ---------- ALLERGY / SKIN ITCHING ---------- */
    "allergy": ["allergy", "khujli", "khujali", "khujli badi", "skin allergy",
        "skin rash", "red spots", "chhota dana", "daad", "dadru", "ringworm",
        "dad", "itchy skin", "allergic reaction", "allergic", "daur ki chot",
        "urticaria", "sheet pitta", "pimpals", "fungus", "fungal infection",
        "skin problem", "twacha ki samasya", "twacha me khujli"],

    /* ---------- SKIN PROBLEMS / ACNE ---------- */
    "acne": ["acne", "pimples", "keel", "muhase", "moomples", "face pimples",
        "chehre pe pimples", "danedar chehra", "pimple marks", "acne marks",
        "blackheads", "whiteheads", "kil muhase", "pimpal", "muhase ki problem",
        "oily skin pimples", "skin blemishes", "pigmentation", "dark spots"],

    /* ---------- INDIGESTION ---------- */
    "indigestion": ["indigestion", "badhazmi", "apach", "apachi", "dyspepsia",
        "khana nahi pach raha", "heavy stomach", "pet bhaari",
        "after food uneasiness", "khana pachana muskil", "digestion problem",
        "pet me jalan", "after lunch problem", "khane ke baad takleef"],

    /* ---------- HEARTBURN / CHEST BURNING ---------- */
    "chest pain": ["chest pain", "chhati ka dard", "chhati me dard",
        "heart pain", "dard dil", "chest discomfort", "heart burn",
        "burning chest", "gas ka chest pain", "acidity chest", "angina"],

    /* ---------- HIGH BLOOD PRESSURE ---------- */
    "high blood pressure": ["high bp", "high blood pressure", "bp high",
        "rakhtchap high", "blood pressure high", "hypertension", "BP badhna",
        "uchcha raktchap", "pressure high", "dizziness high bp"],

    /* ---------- LOW BLOOD PRESSURE ---------- */
    "low blood pressure": ["low bp", "low blood pressure", "bp low",
        "hypotension", "kam raktchap", "pressure low", "chakkar with low bp",
        "weakness low pressure"],

    /* ---------- DIABETES / HIGH SUGAR ---------- */
    "diabetes": ["diabetes", "sugar", "blood sugar", "shakkar ki problem",
        "meetha ki bimari", "high sugar", "hba1c", "madhu meha", "sugar high",
        "sugar control", "glucose high", "type 2 diabetes", "diabetic"],

    /* ---------- CHOLESTEROL / LIPID PROBLEM ---------- */
    "high cholesterol": ["cholesterol", "kolesterol", "cholesterol high",
        "lipid high", "ldl high", "triglycerides", "heart block risk",
        "cholesterol problem", "fat blood", "plaque arteries"],

    /* ---------- THYROID ---------- */
    "thyroid": ["thyroid", "thyroxine", "galganda", "tsh", "t4", "hypothyroidism",
        "thyroid problem", "thyroid kam", "weight gain thyroid", "thyroid ki goli"],

    /* ---------- DEPRESSION / LOW MOOD ---------- */
    "depression": ["depression", "udasi", "udaas", "man nahi lagna",
        "low mood", "sadness", "depressed", "tension", "crying without reason",
        "maan ki udasi", "khushi nahi milna", "nothing feels good"],

    /* ---------- ANXIETY / STRESS ---------- */
    "anxiety": ["anxiety", "tension", "chinta", "fikar", "stress", "stress hai",
        "anxious", "ghabrahat", "gabrana", "panic", "panic attack",
        "chinta bahut", "mental stress", "baar baar sochna", "overthinking"],

    /* ---------- INSOMNIA / SLEEP PROBLEM ---------- */
    "insomnia": ["insomnia", "neend na aana", "sleep problem", "cannot sleep",
        "sleeplessness", "raat me neend nahi", "nind nahi aati", "kam neend",
        "poor sleep", "sleep late", "disturbed sleep", "tired but awake"],

    /* ---------- PERIOD PAIN / MENSTRUAL CRAMPS ---------- */
    "period pain": ["period pain", "periods pain", "menses pain", "mc dard",
        "masik dard", "period cramp", "cramps period", "pet me dard periods",
        "mahavari dard", "stomach cramps periods", "dysmenorrhea",
        "period time pet dard", "first day period pain"],

    /* ---------- UTI / URINE INFECTION ---------- */
    "uti": ["uti", "urine infection", "peshab me jalan", "urine burning",
        "bar bar peshab", "frequent urination", "peshab karne me dard",
        "urinary tract infection", "bladder infection", "peshab infection",
        "peshab me sujan", "urine pain"]
};

/* ================================================================
 * SYMPTOM ↔ MEDICINE CATEGORY MAPPING
 * Maps each detected standardized symptom to the set of medicine
 * "usedFor" categories it should match against.
 * This is the bridge between user query and medicine database.
 * ================================================================ */

const symptomToMedicineMap = {
    "headache": ["Headache", "Migraine", "Body Pain", "Pain Relief"],
    "fever": ["Fever", "Cold & Flu Symptoms", "Body Pain"],
    "cold": ["Cold", "Blocked Nose", "Running Nose", "Sneezing", "Allergic Rhinitis"],
    "cough": ["Cough", "Dry Cough", "Wet Cough", "Productive Cough", "Cold Symptoms"],
    "sore throat": ["Throat Infection", "Ear Infection", "Tonsillitis", "Throat Pain"],
    "stomach pain": ["Stomach Pain", "Abdominal Cramps", "Indigestion", "Peptic Ulcer", "Gastroparesis"],
    "vomiting": ["Vomiting", "Nausea", "Gastroparesis"],
    "diarrhea": ["Diarrhea", "Loose Motions", "Dehydration", "Gastroenteritis", "Acute Diarrhea"],
    "toothache": ["Toothache", "Dental Pain", "Period Pain", "Severe Pain"],
    "ear pain": ["Ear Pain", "Ear Infection", "Toothache"],
    "eye pain": ["Eye Infection", "Eye Pain", "HSV Keratitis", "Conjunctivitis"],
    "back pain": ["Back Pain", "Joint Pain", "Muscle Pain", "Arthritis", "Chronic Joint Pain"],
    "muscle pain": ["Muscle Pain", "Body Pain", "Joint Pain", "Sports Injuries", "Back Pain"],
    "body pain": ["Body Pain", "Headache", "Fever", "Muscle Pain", "Pain Relief"],
    "joint pain": ["Joint Pain", "Arthritis", "Osteoarthritis", "Rheumatoid Arthritis", "Back Pain", "Chronic Joint Pain"],
    "acidity": ["Acidity", "Heartburn", "GERD", "Stomach Ulcer", "Acid Reflux", "Peptic Ulcer"],
    "gas": ["Gas", "Bloating", "Indigestion", "Bloating"],
    "allergy": ["Allergy", "Allergic Rhinitis", "Skin Allergy", "Hay Fever", "Running Nose", "Sneezing", "Urticaria", "Itching Eyes"],
    "acne": ["Acne", "Pimples", "Papules/Pustules", "Whiteheads/Blackheads", "Comedonal Acne"],
    "indigestion": ["Indigestion", "Bloating", "Gas", "Heartburn", "Nausea"],
    "chest pain": ["Angina", "Chest Pain (Angina)", "Chronic Stable Angina", "Heartburn"],
    "high blood pressure": ["High Blood Pressure", "Hypertension", "Chest Pain"],
    "low blood pressure": ["Dehydration", "Weakness"],
    "diabetes": ["Type 2 Diabetes", "Diabetic Kidney Protection", "Pre-diabetes", "Insulin Resistance"],
    "high cholesterol": ["High Cholesterol", "Dyslipidemia", "Heart Disease Prevention"],
    "thyroid": ["Hypothyroidism", "Thyroid Cancer Suppression", "Post Thyroidectomy"],
    "depression": ["Depression", "Generalized Anxiety Disorder", "Panic Disorder"],
    "anxiety": ["Anxiety", "Panic Disorder", "Generalized Anxiety Disorder", "Acute Severe Stress", "Stress"],
    "insomnia": ["Insomnia", "Short-term Insomnia", "Sleep Onset Difficulty"],
    "period pain": ["Period Pain", "Dysmenorrhea", "Menstrual Cramps", "Muscle Pain"],
    "uti": ["Urinary Tract Infection", "Bladder Infection", "UTI Prophylaxis"]
};

/* ================================================================
 * POPULAR SEARCHES (for homepage display)
 * ================================================================ */

const popularSearches = [
    "Sir dard",
    "Bukhar",
    "Pet me dard",
    "Khansi",
    "Daant dard",
    "Gala kharab",
    "Ulti",
    "Body pain",
    "Acidity",
    "Kamar dard",
    "Allergy",
    "Cold"
];

/* ================================================================
 * EXAMPLE SEARCHES (for homepage display)
 * ================================================================ */

const exampleSearches = [
    "Mere sir me dard hai",
    "Bukhar aa raha hai",
    "Pet me dard",
    "Khansi",
    "Daant dard",
    "Gala kharab hai",
    "User ko ulti aa rahi hai",
    "Body pain"
];

/* ================================================================
 * MEDICINE CATEGORIES
 * ================================================================ */

const medicineCategories = [
    "Pain Relief",
    "Pain Relief (Opioid)",
    "Combination Pain Relief",
    "Acidity / Gastric",
    "Antacid / Gas",
    "Antiemetic / Motility",
    "Rehydration / Diarrhea",
    "Anti-diarrheal",
    "Antibiotic",
    "Anti-allergy",
    "Cold Remedy",
    "Cough (Expectorant)",
    "Cough (Antitussive)",
    "Cold Cough Syrup",
    "Antifungal",
    "Antiparasitic",
    "Anti-acne",
    "Skin Care",
    "Steroid (Topical)",
    "Keratolytic",
    "Antiviral",
    "Artificial Tears",
    "Nasal Decongestant",
    "Ear Wax Remover",
    "Local Anesthetic",
    "Cardiovascular",
    "Lipid Lowering",
    "Antiplatelet",
    "Anti-diabetic",
    "Thyroid",
    "Vitamin Supplement",
    "Mineral Supplement",
    "Anxiolytic",
    "Hypnotic",
    "Antidepressant",
    "Herbal Digestive",
    "Antihypertensive (FDC)",
    "Erectile Dysfunction",
    "Antiseptic (Topical)"
];

/* ================================================================
 * HELPER: SYMPTOM DETECTION FROM INPUT QUERY
 * Input: raw user string (Hinglish/Hindi/English)
 * Output: array of UNIQUE detected standardized symptom strings
 * ================================================================ */

function detectSymptoms(query) {
    if (!query || typeof query !== "string") return [];
    const normalized = query.toLowerCase().trim();
    const detected = new Set();

    for (const [standardSymptom, variations] of Object.entries(symptomMap)) {
        for (const variant of variations) {
            if (normalized.includes(variant.toLowerCase())) {
                detected.add(standardSymptom);
                break;
            }
        }
    }

    return Array.from(detected);
}

/* ================================================================
 * HELPER: EXPAND SYMPTOMS → MEDICINE TARGET CATEGORIES
 * Input: array of detected standardized symptoms
 * Output: array of "usedFor" string targets
 * ================================================================ */

function getMedicineTargets(symptoms) {
    const targets = new Set();
    for (const s of symptoms) {
        const mapped = symptomToMedicineMap[s];
        if (mapped) for (const m of mapped) targets.add(m);
    }
    return Array.from(targets);
}

/* ================================================================
 * MEDICINE DATABASE (loaded from medicines.json or inline fallback)
 * Will be populated when app initializes via loadMedicines()
 * ================================================================ */

let MEDICINE_DB = [];

/**
 * Loads the medicine database.
 * Priority order (ensures 110 medicines work even on file:// protocol):
 *   1. window.MEDICINES_INLINE  (from medicines-data.js - inlined full dataset)
 *   2. fetch("medicines.json")  (if served over http/https)
 *   3. FALLBACK_MEDS            (very small emergency dataset)
 * Returns a Promise<Array> of medicine objects.
 */
async function loadMedicines() {
    if (typeof window !== "undefined" && Array.isArray(window.MEDICINES_INLINE) && window.MEDICINES_INLINE.length > 10) {
        MEDICINE_DB = window.MEDICINES_INLINE.slice();
        return MEDICINE_DB;
    }
    try {
        const response = await fetch("medicines.json", { cache: "no-cache" });
        if (!response.ok) throw new Error("HTTP " + response.status);
        const data = await response.json();
        if (Array.isArray(data) && data.length) {
            MEDICINE_DB = data;
            return MEDICINE_DB;
        }
        throw new Error("Empty or invalid JSON");
    } catch (err) {
        console.warn("Could not load medicines (file:// protocol or network issue). Using inlined dataset or final fallback.", err);
        if (typeof window !== "undefined" && Array.isArray(window.MEDICINES_INLINE) && window.MEDICINES_INLINE.length) {
            MEDICINE_DB = window.MEDICINES_INLINE.slice();
            return MEDICINE_DB;
        }
        MEDICINE_DB = FALLBACK_MEDS;
        return MEDICINE_DB;
    }
}

/** Very small fallback dataset (used only if JSON loading fails). */
const FALLBACK_MEDS = [
    {
        id: 1, name: "Paracetamol 500mg", category: "Pain Relief",
        keywords: ["paracetamol", "crocin", "dolo", "calpol"],
        description: "Common OTC pain reliever and fever reducer.",
        usedFor: ["Headache", "Fever", "Body Pain", "Toothache", "Muscle Pain"],
        food: "Either", typicalUse: "1-2 tabs every 4-6h, max 4g/day.",
        sideEffects: ["Nausea (rare)", "Liver damage (overdose)"],
        avoidIf: ["Severe liver disease"],
        storage: "Store at room temp, keep away from moisture.",
        warning: "Do not exceed dose. Overdose causes liver damage.",
        type: "OTC", image: "pill"
    },
    {
        id: 2, name: "Cetirizine 10mg", category: "Anti-allergy",
        keywords: ["cetirizine", "cetrine", "zyrtec", "cetzine"],
        description: "Second-gen antihistamine for allergy relief.",
        usedFor: ["Allergy", "Running Nose", "Sneezing", "Skin Allergy"],
        food: "Either", typicalUse: "1 tab once daily.",
        sideEffects: ["Mild drowsiness", "Dry mouth"],
        avoidIf: ["Breastfeeding", "Severe renal failure"],
        storage: "Store below 30°C.",
        warning: "May cause drowsiness - caution driving.",
        type: "OTC", image: "pill"
    },
    {
        id: 3, name: "Omeprazole 20mg", category: "Acidity / Gastric",
        keywords: ["omeprazole", "omez", "prilosec"],
        description: "PPI for powerful acid suppression.",
        usedFor: ["Acidity", "Heartburn", "GERD", "Stomach Ulcer"],
        food: "Before food (30-60 min before meal)",
        typicalUse: "1 capsule once daily before breakfast.",
        sideEffects: ["Headache", "Abdominal pain"],
        avoidIf: ["PPI allergy"],
        storage: "Store below 25°C.",
        warning: "Take before eating for best results.",
        type: "OTC", image: "capsule"
    }
];

/**
 * Retrieves a single medicine by its id.
 * @param {number|string} id
 * @returns {object|undefined}
 */
function getMedicineById(id) {
    if (!id) return undefined;
    const numericId = typeof id === "number" ? id : parseInt(id, 10);
    return MEDICINE_DB.find(m => m.id === numericId);
}

/**
 * Retrieves all unique medicine categories sorted alphabetically.
 * @returns {string[]}
 */
function getAllCategories() {
    if (!MEDICINE_DB.length) return medicineCategories.slice();
    const set = new Set(MEDICINE_DB.map(m => m.category));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/**
 * Retrieves all medicines sorted alphabetically by name.
 * @returns {object[]}
 */
function getAllMedicinesSorted() {
    return MEDICINE_DB.slice().sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Groups medicines alphabetically by first letter of their name.
 * @returns {Record<string, object[]>}
 */
function getAlphabeticalIndex() {
    const index = {};
    const sorted = getAllMedicinesSorted();
    for (const med of sorted) {
        const letter = med.name.charAt(0).toUpperCase();
        if (!index[letter]) index[letter] = [];
        index[letter].push(med);
    }
    return index;
}

/* ================================================================
 * Expose as global (for browser script-tag inclusion)
 * ================================================================ */

window.MediDeskDB = {
    symptomMap,
    symptomToMedicineMap,
    popularSearches,
    exampleSearches,
    medicineCategories,
    detectSymptoms,
    getMedicineTargets,
    loadMedicines,
    getMedicineById,
    getAllCategories,
    getAllMedicinesSorted,
    getAlphabeticalIndex,
    FALLBACK_MEDS,
    get db() { return MEDICINE_DB; }
};
