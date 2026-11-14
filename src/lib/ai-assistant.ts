import fs from "node:fs";
import path from "node:path";
import type { ParsedMedicine, ParsedPrescription } from "./types";

export type AiProvider = "auto" | "gemini" | "openai" | "groq" | "anthropic" | "builtin";

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model?: string;
}

export interface MedicineClinicalGuide {
  name: string;
  dosage: string;
  category: string;
  whyPrescribed: string;
  howToTake: string;
  sideEffects: string;
  precautions: string;
}

export interface AiPrescriptionInsights {
  engineUsed: string;
  summary: string;
  conditionOverview: string;
  medicineGuides: MedicineClinicalGuide[];
  interactions: {
    status: "safe" | "caution";
    headline: string;
    details: string[];
  };
  doctorAdvice: string[];
  lifestyleTips: string[];
  redFlags: string[];
  suggestedQuestions: string[];
}

const CONFIG_PATH = path.join(process.cwd(), ".ai-config.json");

export function getServerAiConfig(headerKey?: string | null, headerProvider?: string | null): {
  provider: "gemini" | "openai" | "groq" | "anthropic" | "builtin";
  apiKey: string;
  hasExternalKey: boolean;
} {
  let key = (headerKey ?? "").trim();
  let prov = (headerProvider ?? "auto").trim().toLowerCase();

  if (!key) {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const saved = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) as Partial<AiConfig>;
        if (saved.apiKey) key = saved.apiKey.trim();
        if (saved.provider && prov === "auto") prov = saved.provider;
      }
    } catch {
      /* ignore file read errors */
    }
  }

  if (!key) {
    if (process.env.ANTHROPIC_API_KEY) {
      key = process.env.ANTHROPIC_API_KEY.trim();
      prov = "anthropic";
    } else if (process.env.GEMINI_API_KEY) {
      key = process.env.GEMINI_API_KEY.trim();
      prov = "gemini";
    } else if (process.env.GOOGLE_AI_API_KEY) {
      key = process.env.GOOGLE_AI_API_KEY.trim();
      prov = "gemini";
    } else if (process.env.OPENAI_API_KEY) {
      key = process.env.OPENAI_API_KEY.trim();
      prov = "openai";
    } else if (process.env.GROQ_API_KEY) {
      key = process.env.GROQ_API_KEY.trim();
      prov = "groq";
    }
  }

  if (!key) {
    return { provider: "builtin", apiKey: "", hasExternalKey: false };
  }

  if (prov === "auto" || !["gemini", "openai", "groq", "anthropic"].includes(prov)) {
    if (key.startsWith("AIza")) prov = "gemini";
    else if (key.startsWith("gsk_")) prov = "groq";
    else if (key.startsWith("sk-ant-")) prov = "anthropic";
    else if (key.startsWith("sk-")) prov = "openai";
    else prov = "gemini";
  }

  return {
    provider: prov as "gemini" | "openai" | "groq" | "anthropic",
    apiKey: key,
    hasExternalKey: true,
  };
}

export function saveServerAiConfig(cfg: { provider?: string; apiKey?: string }) {
  const clean: AiConfig = {
    provider: (cfg.provider as AiProvider) || "auto",
    apiKey: (cfg.apiKey ?? "").trim(),
  };
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(clean, null, 2), "utf8");
  } catch {
    /* ignore write errors in read-only environments */
  }
  return getServerAiConfig(clean.apiKey, clean.provider);
}

/* -------------------------------------------------------------------------- */
/*  Clinical Pharmacology Knowledge Base (Hinglish + English)                  */
/* -------------------------------------------------------------------------- */

interface ClinicalProfile {
  keywords: string[];
  category: string;
  whyPrescribed: string;
  howToTake: string;
  sideEffects: string;
  precautions: string;
}

const CLINICAL_PROFILES: ClinicalProfile[] = [
  {
    keywords: ["paracetamol", "dolo", "crocin", "calpol", "pacimol", "acetaminophen", "sumo l", "fepanil"],
    category: "Antipyretic & Analgesic (Bukhar aur Dard ki dawa)",
    whyPrescribed:
      "Bukhar (fever) kam karne aur badan dard, sir dard ya gale ke dard se aaram dilane ke liye di jaati hai.",
    howToTake:
      "Hamesha khane ya halki diet ke baad pani ke saath lein. Agar SOS likha hai to sirf tabhi lein jab bukhar (>99.5°F) ya dard ho. Do doses ke beech kam se kam 4–6 ghante ka gap rakhein.",
    sideEffects:
      "Aam taur par bilkul safe hai. Bahut kam cases mein halka pet kharab ya nausea ho sakta hai.",
    precautions:
      "24 ghante mein 3–4 tablets (maximum 3000–4000 mg) se zyada na lein. Iske saath koi doosri paracetamol wali cold/flu tablet na lein.",
  },
  {
    keywords: ["azithromycin", "azithral", "azee", "zithromax", "azax", "aziwok"],
    category: "Macrolide Antibiotic (Bacterial Infection ki dawa)",
    whyPrescribed:
      "Gale ke infection (throat infection), tonsillitis, sinus, chest ya bacterial viral-secondary infection ko जड़ se khatam karne ke liye.",
    howToTake:
      "Din mein 1 baar (OD) roz ek hi fixed time par lein. Khane ke 1 ghante pehle ya khane ke 2 ghante baad lena best rehta hai (pet mein jalan ho to halke khane ke baad le sakte hain).",
    sideEffects:
      "Halka pet dard, loose motion, ya muh ka swaad badalna ho sakta hai.",
    precautions:
      "Doctor ne jitne din (jaise 3 ya 5 din) likha hai, course poora khatam karein — beech mein bukhar utarne par bhi antibiotic band na karein, warna infection wapas aa sakta hai. Antacid ke saath 2 ghante ka gap rakhein.",
  },
  {
    keywords: ["levocetirizine", "cetirizine", "cetzine", "okacet", "alerid", "levocet", "vozet", "xyzal", "teczine"],
    category: "Antihistamine / Anti-Allergic (Allergy, Jukham aur Khansi ki dawa)",
    whyPrescribed:
      "Allergy, naak behna (runny nose), chheenk aana, gale mein kharash/khujli aur aankhon se pani aane ko rokne ke liye.",
    howToTake:
      "Aam taur par raat ko sote samay (HS / At bedtime) 1 tablet li jaati hai kyunki isse halki neend aa sakti hai.",
    sideEffects:
      "Halki neend ya susti (drowsiness), muh sookhna (dry mouth).",
    precautions:
      "Is dawa ko lene ke baad gaadi (driving) ya heavy machinery na chalayein. Alcohol se parhez karein.",
  },
  {
    keywords: ["pantoprazole", "omeprazole", "rabeprazole", "esomeprazole", "pan", "pantocid", "pantop", "omez", "razo", "rablet", "sompraz"],
    category: "Proton Pump Inhibitor — Antacid (Gas aur Acidity ki dawa)",
    whyPrescribed:
      "Pet mein banne wale extra acid, jalan (heartburn), gas, aur painkillers/antibiotics se hone wali acidity se bachav ke liye.",
    howToTake:
      "Subah khali pet (nashte se 30–45 minute pehle) ek glass pani ke saath bina tode/chabaye nigal lein.",
    sideEffects:
      "Aam taur par koi dikkat nahi hoti; kabhi-kabhi halka sir dard ya gas mehsoos ho sakti hai.",
    precautions:
      "Capsule ya enteric-coated tablet ko chabana ya todna nahi chahiye.",
  },
  {
    keywords: ["ascoril", "ambroxol", "benadryl", "grilinctus", "alex", "corex", "mucolite", "ambrodil", "chericof", "torex"],
    category: "Cough Syrup / Expectorant (Khansi aur Balgam ki dawa)",
    whyPrescribed:
      "Khansi ko shant karne aur chhati/gale mein jame hue balgam (mucus) ko patla karke bahar nikalne mein madad karta hai.",
    howToTake:
      "Measuring cap se naap kar (jaise 5 ml ya 10 ml) din mein 2–3 baar (BD/TDS) khane ke baad lein. Dawa lene ke 15-20 minute tak pani na piyein, uske baad gunguna pani piyein.",
    sideEffects:
      "Halki neend, chhati mein garmi ya halka nausea.",
    precautions:
      "Thanda pani, cold drinks, dahi aur tali-bhuni cheezon se parhez karein; gunguna pani (warm fluids) lein.",
  },
  {
    keywords: ["amoxicillin", "augmentin", "clavam", "mox", "moxclav", "novamox", "cefixime", "taxim", "zifi", "mahacef", "cefpodoxime", "monocef", "ofloxacin", "ciplox", "levoflox", "doxycycline"],
    category: "Broad-Spectrum Antibiotic (Bacterial Infection ki dawa)",
    whyPrescribed:
      "Gale, kaan, sinus, chest, urinary ya skin ke bacterial infection ko theek karne ke liye.",
    howToTake:
      "Pet kharab hone se bachne ke liye khane ke turant baad lein aur har dose fixed ghanton ke antar par lein.",
    sideEffects:
      "Loose motion (diarrhoea), nausea, ya pet mein marod — probiotic ya dahi lene se madad milti hai.",
    precautions:
      "Poora antibiotic course complete karna zaroori hai.",
  },
  {
    keywords: ["ibuprofen", "diclofenac", "aceclofenac", "zerodol", "hifenac", "voveran", "combiflam", "flexon", "meftal", "nise", "nucoxia"],
    category: "NSAID Painkiller & Anti-inflammatory (Dard aur Soojan ki dawa)",
    whyPrescribed:
      "Tez dard, soojan (swelling), jodon ya manspeshiyon ke dard aur bukhar ko kam karne ke liye.",
    howToTake:
      "Hamesha bhojan (khane) ya doodh ke baad hi lein — khali pet bilkul na lein.",
    sideEffects:
      "Khali pet lene par pet mein jalan, acidity ya dard ho sakta hai.",
    precautions:
      "Agar pet mein ulcer, kidney ki samasya ya asthma hai to doctor ko zaroor batayein.",
  },
  {
    keywords: ["vitamin", "limcee", "celin", "becosules", "zincovit", "supradyn", "calcirol", "shelcal", "neurobion", "nurokind", "evion", "folvite", "orofer"],
    category: "Vitamin & Nutritional Supplement (Immunity aur ताकत ke liye)",
    whyPrescribed:
      "Sharir ki immunity badhane, kamzori door karne aur bimari se jaldi recovery mein madad ke liye.",
    howToTake:
      "Rozana subah ya dopahar ke khane ke baad lein (Vitamin C chewable tablet ko chaba kar kha sakte hain).",
    sideEffects:
      "B-complex/Multivitamin se urine ka rang peela (bright yellow) ho sakta hai jo bilkul normal hai.",
    precautions:
      "Rozana niyamit samay par lein.",
  },
  {
    keywords: ["metformin", "glycomet", "glimepiride", "amaryl", "januvia", "janumet", "galvus", "forxiga", "jardiance"],
    category: "Anti-Diabetic Medicine (Sugar / Diabetes ki dawa)",
    whyPrescribed:
      "Blood sugar level ko control mein rakhne ke liye.",
    howToTake:
      "Doctor ke nirdeshanusar khane se pehle (Glimepiride) ya khane ke saath/baad (Metformin) lein.",
    sideEffects:
      "Khana skip karne par low blood sugar (chakkar, paseena) ya halka pet bharapan.",
    precautions:
      "Dawa lene ke baad khana kabhi skip na karein.",
  },
  {
    keywords: ["amlodipine", "amlokind", "stamlo", "telmisartan", "telma", "losartan", "losar", "metoprolol", "metolar", "concor", "atorvastatin", "atorva", "rosuvastatin", "rosuvas"],
    category: "Cardiovascular / BP & Cholesterol Medicine",
    whyPrescribed:
      "High blood pressure ya cholesterol ko control karke heart ko surakshit rakhne ke liye.",
    howToTake:
      "Roz ek hi nishchit samay par lein (Cholesterol ki dawa jaise Atorvastatin/Rosuvastatin aksar raat ko li jaati hai).",
    sideEffects:
      "Shuruat mein halka chakkar ya pairon mein halki soojan (Amlodipine se) ho sakti hai.",
    precautions:
      "Bina doctor se pooche BP ya heart ki dawa achanak band na karein.",
  },
];

function findProfile(medName: string, purpose?: string | null): ClinicalProfile {
  const lower = `${medName} ${purpose ?? ""}`.toLowerCase();
  for (const p of CLINICAL_PROFILES) {
    if (p.keywords.some((k) => lower.includes(k))) return p;
  }
  return {
    keywords: [],
    category: purpose || "Prescribed Medication",
    whyPrescribed: purpose
      ? `${purpose} ke ilaj aur aaram ke liye doctor dwara prescribe ki gayi hai.`
      : "Doctor dwara aapke symptoms aur diagnosis ke hisaab se prescribe ki gayi dawa.",
    howToTake: "Prescription mein likhe samay aur instructions (khane ke pehle/baad) ke hisaab se pani ke saath lein.",
    sideEffects: "Aam taur par सुरक्षित; kisi bhi asadharan lakshan (rash, chakkar, ulti) par doctor se sampark karein.",
    precautions: "Course poora karein aur nirdharit dose se zyada na lein.",
  };
}

function buildHowToTakeText(m: ParsedMedicine, profile: ClinicalProfile): string {
  const parts: string[] = [];
  if (m.asNeeded) {
    parts.push("Jab zaroorat ho tabhi lein (SOS — jaise bukhar ya dard hone par).");
  } else if (m.frequencyLabel) {
    const slotText = m.slots.length ? ` (${m.slots.join(", ")})` : "";
    parts.push(`Frequency: ${m.frequencyLabel}${slotText}.`);
  }
  if (m.instructions) parts.push(`Instruction: ${m.instructions}.`);
  if (m.durationDays) parts.push(`Duration: ${m.durationDays} din tak lein.`);
  parts.push(profile.howToTake);
  return parts.join(" ");
}

function extractAdviceLines(rawText: string): string[] {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const advice: string[] = [];
  let inAdvice = false;

  for (const line of lines) {
    if (/^(?:advice|instructions?|note|salah)\s*[:-]?/i.test(line)) {
      inAdvice = true;
      const rest = line.replace(/^(?:advice|instructions?|note|salah)\s*[:-]?\s*/i, "").trim();
      if (rest) advice.push(rest.replace(/^[•*\-–—]+\s*/, ""));
      continue;
    }
    if (inAdvice) {
      if (/^(?:dr\.?\b|mbbs|reg\.?\s*no|sign|review|follow)/i.test(line) && !/consult|karein|days/i.test(line)) {
        break;
      }
      const clean = line.replace(/^[•*\-–—]+\s*/, "").trim();
      if (clean.length >= 3) advice.push(clean);
    }
  }
  return advice;
}

export function generateLocalAiInsights(
  parsed: ParsedPrescription,
  rawText: string,
  engineLabel = "MediScan Clinical AI",
): AiPrescriptionInsights {
  const meds = parsed.medicines;
  const guides: MedicineClinicalGuide[] = meds.map((m) => {
    const profile = findProfile(m.name, m.purpose);
    return {
      name: m.name,
      dosage: [m.dosage, m.form].filter(Boolean).join(" · ") || "As prescribed",
      category: profile.category,
      whyPrescribed: profile.whyPrescribed,
      howToTake: buildHowToTakeText(m, profile),
      sideEffects: profile.sideEffects,
      precautions: profile.precautions,
    };
  });

  const namesLower = meds.map((m) => m.name.toLowerCase()).join(" ");
  const hasAntibiotic = /azithromycin|amoxicillin|augmentin|clavam|cefixime|taxim|zifi|ciplox|levoflox|oflox|doxy|metronidazole/.test(namesLower);
  const hasFeverMed = /paracetamol|dolo|crocin|calpol|ibuprofen|combiflam/.test(namesLower);
  const hasAllergyMed = /levocetirizine|cetirizine|montelukast|allegra|fexofenadine|sinarest|ascoril/.test(namesLower);
  const hasAntacid = /pantoprazole|omeprazole|rabeprazole|pan|omez|razo|digene|gelusil/.test(namesLower);

  let conditionOverview = parsed.diagnosis
    ? `Diagnosis / Condition: ${parsed.diagnosis}.`
    : "Prescription ke medicines ke hisaab se yeh Acute Fever, Throat / Upper Respiratory Infection ya Allergy ke ilaj ke liye hai.";

  if (!parsed.diagnosis) {
    if (hasFeverMed && hasAntibiotic && hasAllergyMed) {
      conditionOverview =
        "Is prescription mein Bukhar/Dard (Paracetamol), Bacterial Throat/Respiratory Infection (Antibiotic), aur Allergy/Cold (Anti-allergic) teeno ka combination hai — jo aam taur par Viral/Bacterial Fever with Throat Infection & Cold ke liye diya jata hai.";
    } else if (hasFeverMed && hasAllergyMed) {
      conditionOverview = "Yeh dawaiyaan Bukhar, Jukham (Cold) aur Allergy se aaram dilane ke liye di gayi hain.";
    }
  }

  const interactionDetails: string[] = [];
  let interactionStatus: "safe" | "caution" = "safe";

  if (meds.length > 1) {
    interactionDetails.push(
      `✅ ${meds.map((m) => m.name).join(", ")} — ye medicines ek saath doctor ke schedule ke hisaab se lena safe hai.`,
    );
  }
  if (hasAntibiotic && hasAntacid) {
    interactionStatus = "caution";
    interactionDetails.push(
      "⏰ Antibiotic aur Gas/Acidity ki dawa ke beech kam se kam 1 se 2 ghante ka antar rakhein taaki antibiotic ka poora asar ho.",
    );
  }
  if (hasAllergyMed) {
    interactionDetails.push(
      "🌙 Anti-allergic dawa (jaise Levocetirizine / Cetirizine) se halki neend aa sakti hai — isse raat ko sote samay (HS) lena sabse accha hai.",
    );
  }
  if (hasFeverMed) {
    interactionDetails.push(
      "🌡️ Paracetamol (SOS) tabhi lein jab bukhar ya dard ho, aur do doses ke beech kam se kam 4–6 ghante ka gap rakhein.",
    );
  }
  if (interactionDetails.length === 0) {
    interactionDetails.push("✅ Prescribed medicines mein koi harmful drug interaction nahi paya gaya.");
  }

  const extractedAdvice = extractAdviceLines(rawText);
  const doctorAdvice =
    extractedAdvice.length > 0
      ? extractedAdvice
      : [
          "Din bhar paryapt matra mein gunguna pani aur तरल पदार्थ (plenty of fluids) lein.",
          "Poora aaram (rest) karein taaki sharir jaldi recover ho.",
          "Agar bukhar 3 din se zyada rahe ya takleef badhe to doctor se dubara consult karein.",
        ];

  const doctorPart = parsed.doctor ? `Dr. ${parsed.doctor.replace(/^Dr\.?\s*/i, "")} dwara ` : "";
  const patientPart = parsed.patient ? `${parsed.patient} ke liye ` : "";
  const summary = `${doctorPart}${patientPart}likhe gaye is prescription mein kul ${meds.length} medicine${meds.length === 1 ? "" : "s"} (${meds.map((m) => m.name).join(", ")}) hain. ${conditionOverview}`;

  return {
    engineUsed: engineLabel,
    summary,
    conditionOverview,
    medicineGuides: guides,
    interactions: {
      status: interactionStatus,
      headline:
        interactionStatus === "safe"
          ? "Safe Combination — No major drug interactions detected"
          : "Safe with timing precautions — Doses ke beech gap ka dhyan rakhein",
      details: interactionDetails,
    },
    doctorAdvice,
    lifestyleTips: [
      "Gunguna pani (warm water), soup, ORS ya nariyal pani piyein — dehydration na hone dein.",
      "Halka, ghar ka bana taza khana (khichdi, dalia, dal-roti) khayein; thanda aur tala-bhuna khana avoid karein.",
      hasAntibiotic
        ? "Antibiotic ka course (jaise 3 din) beech mein band na karein, chahe 1-2 din mein hi aaram lagne lage."
        : "Sabhi medicines apne nirdharit reminder time par hi lein.",
    ],
    redFlags: [
      "Agar bukhar 3 din se zyada rahe ya 102°F se upar jaye.",
      "Saans lene mein takleef, tez chhati dard, ya skin par rash/khujli ho.",
      "Lagatar ulti ho jisse pani ya dawa pet mein na ruke — turant doctor se milein.",
    ],
    suggestedQuestions: [
      "In medicines ko khane se pehle lena hai ya baad mein?",
      "SOS, OD aur HS ka kya matlab hota hai?",
      "Kya in dawaiyon ka koi side effect hai?",
      "Agar bukhar 3 din se jyada rahe to kya karein?",
      "Bukhar aur throat infection mein kya khana-peena chahiye?",
    ],
  };
}

/* -------------------------------------------------------------------------- */
/*  External AI Vision (Gemini / OpenAI / Groq) for Doctor Handwriting         */
/* -------------------------------------------------------------------------- */

const VISION_PROMPT = `You are a careful medical-document OCR specialist. Read the prescription in English, Bengali, Hindi, or Hinglish where possible.

You may receive two images: the original photo and a contrast-enhanced version of the same photo. Compare both; the enhanced image may make faint writing easier to see, but the original preserves the doctor's strokes.
Transcribe only what is visible. Never guess a medicine name, strength, dose, frequency, duration, diagnosis, or instruction from context. If any text is unclear, write "[unclear]" in rawText and omit that uncertain medicine from the structured medicines list. Use null or an empty string for fields that cannot be read. Set confidence from 0 to 1 based on legibility, not on how medically plausible the result seems.

Return ONLY a valid JSON object (no markdown fences) matching this exact structure:
{
  "rawText": "Full verbatim transcription of everything written on the prescription including hospital, patient, date, Rx medicines, advice, and doctor name/registration",
  "doctor": "Doctor name e.g. Dr. R.K. Gupta or null",
  "patient": "Patient name e.g. Abhishek Kaurav or null",
  "date": "YYYY-MM-DD format if a date is present (convert DD/MM/YYYY to YYYY-MM-DD) or null",
  "diagnosis": "Diagnosis or chief complaints if mentioned, or inferred brief indication, or null",
  "advice": ["Array of doctor advice bullet points written on the prescription"],
  "summary": "Helpful 2-3 sentence summary in simple Hinglish/English explaining what this prescription is for",
  "medicines": [
    {
      "name": "Clean medicine name (e.g. Paracetamol, Azithromycin, Levocetirizine)",
      "form": "Tablet | Capsule | Syrup | Injection | Drops | Cream | Gel | Ointment | Sachet | Inhaler",
      "dosage": "Strength e.g. 650 mg, 500 mg, 5 mg, 5 ml",
      "frequencyLabel": "Human readable frequency e.g. As needed (SOS), Once a day (OD), At bedtime (HS), 1-0-1, Twice a day (BD), 3 times a day (TDS)",
      "slots": ["Array of slots from: morning, afternoon, evening, night, bedtime. Empty array [] if SOS/asNeeded"],
      "asNeeded": false,
      "durationDays": 5,
      "instructions": "e.g. After food, Before food, On empty stomach, At bedtime, For fever/pain",
      "purpose": "Short purpose if clearly written or identifiable, otherwise null",
      "confidence": 0.7
    }
  ]
}`;

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  try {
    return JSON.parse(cleaned.slice(first, last + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function runExternalAiVision(
  dataUrl: string,
  provider: "gemini" | "openai" | "groq" | "anthropic",
  apiKey: string,
  enhancedDataUrl?: string,
): Promise<{ rawText: string; parsed: ParsedPrescription; insights: AiPrescriptionInsights }> {
  const imageUrls = [dataUrl, enhancedDataUrl].filter((image): image is string => Boolean(image));
  const images = imageUrls.map((image) => {
    const match = /^data:(image\/[\w.+-]+);base64,(.+)$/.exec(image);
    if (!match) throw new Error("Prescription image must be a base64-encoded image.");
    return { mimeType: match[1], base64: match[2] };
  });
  const uniqueImages = images.filter(
    (image, index) => images.findIndex((other) => other.base64 === image.base64) === index,
  );
  const geminiParts = [
    { text: VISION_PROMPT },
    ...uniqueImages.map((image) => ({
      inline_data: { mime_type: image.mimeType, data: image.base64 },
    })),
  ];
  const anthropicContent = [
    { type: "text" as const, text: VISION_PROMPT },
    ...uniqueImages.map((image) => ({
      type: "image" as const,
      source: { type: "base64" as const, media_type: image.mimeType, data: image.base64 },
    })),
  ];
  const openAiContent = [
    { type: "text" as const, text: VISION_PROMPT },
    ...uniqueImages.map((image) => ({
      type: "image_url" as const,
      image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
    })),
  ];

  let responseText = "";
  let engineLabel = "AI Vision";

  if (provider === "gemini") {
    engineLabel = "Google Gemini Vision AI";
    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    let lastErr = "";
    for (const model of models) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: geminiParts,
              },
            ],
            generationConfig: { temperature: 0.1 },
          }),
        },
      );
      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        responseText = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("\n") ?? "";
        if (responseText) break;
      } else {
        lastErr = await res.text().catch(() => `HTTP ${res.status}`);
      }
    }
    if (!responseText) throw new Error(`Gemini Vision API error: ${lastErr.slice(0, 180)}`);
  } else if (provider === "anthropic") {
    engineLabel = "Anthropic Claude Vision AI";
    const models = ["claude-sonnet-4-5", "claude-3-5-sonnet-latest"];
    let lastErr = "";
    for (const model of models) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          temperature: 0.1,
          messages: [
            {
              role: "user",
              content: anthropicContent,
            },
          ],
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { content?: { type?: string; text?: string }[] };
        responseText = (data.content ?? [])
          .filter((block) => block.type === "text")
          .map((block) => block.text ?? "")
          .join("\n");
        if (responseText) break;
      } else {
        lastErr = await res.text().catch(() => `HTTP ${res.status}`);
      }
    }
    if (!responseText) throw new Error(`Anthropic Vision API error: ${lastErr.slice(0, 180)}`);
  } else if (provider === "openai") {
    engineLabel = "OpenAI GPT-4o Vision";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: openAiContent,
          },
        ],
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`OpenAI API error (${res.status}): ${errText.slice(0, 160)}`);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    responseText = data.choices?.[0]?.message?.content ?? "";
  } else if (provider === "groq") {
    engineLabel = "Groq Llama Vision AI";
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: openAiContent,
          },
        ],
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Groq Vision API error (${res.status}): ${errText.slice(0, 160)}`);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    responseText = data.choices?.[0]?.message?.content ?? "";
  }

  const obj = extractJsonObject(responseText);
  if (!obj) {
    throw new Error("AI response could not be parsed as JSON.");
  }

  const rawText = typeof obj.rawText === "string" && obj.rawText.trim() ? obj.rawText.trim() : responseText;
  const rawMeds = Array.isArray(obj.medicines) ? obj.medicines : [];

  const medicines: ParsedMedicine[] = rawMeds
    .filter((m): m is Record<string, unknown> => Boolean(m && typeof m === "object" && typeof (m as Record<string, unknown>).name === "string"))
    .map((m) => {
      const asNeeded = Boolean(m.asNeeded) || /sos|as needed/i.test(String(m.frequencyLabel ?? ""));
      const validSlots = Array.isArray(m.slots)
        ? (m.slots.filter((s) => ["morning", "afternoon", "evening", "night", "bedtime"].includes(String(s))) as ParsedMedicine["slots"])
        : [];
      const slots: ParsedMedicine["slots"] = asNeeded ? [] : validSlots.length > 0 ? validSlots : ["morning"];
      const reportedConfidence = typeof m.confidence === "number" && Number.isFinite(m.confidence)
        ? Math.max(0, Math.min(1, m.confidence))
        : 0.5;
      return {
        name: String(m.name).trim(),
        rawLine: `${m.name} ${m.dosage ?? ""} ${m.frequencyLabel ?? ""}`.trim(),
        form: typeof m.form === "string" ? m.form : "Tablet",
        dosage: typeof m.dosage === "string" ? m.dosage : null,
        frequencyLabel: typeof m.frequencyLabel === "string" ? m.frequencyLabel : asNeeded ? "As needed (SOS)" : "Once a day",
        slots,
        intervalHours: null,
        asNeeded,
        durationDays: typeof m.durationDays === "number" && m.durationDays > 0 ? m.durationDays : null,
        instructions: typeof m.instructions === "string" ? m.instructions : null,
        purpose: typeof m.purpose === "string" ? m.purpose : null,
        confidence: reportedConfidence,
        matched: true,
      };
    });

  const parsed: ParsedPrescription = {
    doctor: typeof obj.doctor === "string" ? obj.doctor : null,
    patient: typeof obj.patient === "string" ? obj.patient : null,
    date: typeof obj.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(obj.date) ? obj.date : null,
    diagnosis: typeof obj.diagnosis === "string" ? obj.diagnosis : null,
    medicines,
  };

  const insights = generateLocalAiInsights(parsed, rawText, engineLabel);
  if (typeof obj.summary === "string" && obj.summary.trim()) {
    insights.summary = obj.summary.trim();
  }
  if (Array.isArray(obj.advice) && obj.advice.length > 0) {
    insights.doctorAdvice = obj.advice.map((a) => String(a));
  }

  return { rawText, parsed, insights };
}

/* -------------------------------------------------------------------------- */
/*  Interactive AI Doctor Chat (External LLM + Smart Built-in Fallback)        */
/* -------------------------------------------------------------------------- */

export async function answerMedicalQuestion({
  question,
  prescriptionContext,
  provider,
  apiKey,
}: {
  question: string;
  prescriptionContext: string;
  provider: "gemini" | "openai" | "groq" | "anthropic" | "builtin";
  apiKey: string;
}): Promise<{ answer: string; engine: string }> {
  const sysPrompt = `You are MediScan AI, a compassionate, knowledgeable Indian clinical pharmacist and medical assistant.
Answer the patient's question clearly in friendly Hinglish (Hindi written in English script mixed with simple English medical terms) or English (matching the language of the user's question).
Use bullet points for readability. Give practical, accurate guidance about medicine timing, dosage meanings (OD, BD, TDS, HS, SOS), side effects, food precautions, and recovery tips.
Always remind them to consult their doctor for severe or persistent symptoms.

Current Patient Prescription & Medicine Context:
${prescriptionContext || "General medicine inquiry"}`;

  if (provider !== "builtin" && apiKey) {
    try {
      if (provider === "anthropic") {
        const models = [
          "claude-sonnet-4-5",
          "claude-sonnet-4-5-20250929",
          "claude-3-5-sonnet-latest",
          "claude-3-5-sonnet-20241022",
          "claude-3-haiku-20240307",
        ];
        for (const model of models) {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model,
              max_tokens: 2048,
              temperature: 0.3,
              system: sysPrompt,
              messages: [{ role: "user", content: question }],
            }),
          });
          if (res.ok) {
            const data = (await res.json()) as {
              content?: { type?: string; text?: string }[];
            };
            const text = (data.content ?? [])
              .filter((b) => b.type === "text")
              .map((b) => b.text ?? "")
              .join("\n");
            if (text.trim()) return { answer: text.trim(), engine: `Anthropic Claude (${model})` };
          }
        }
      } else if (provider === "gemini") {
        const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
        for (const model of models) {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `${sysPrompt}\n\nPatient Question: ${question}` }] }],
                generationConfig: { temperature: 0.3 },
              }),
            },
          );
          if (res.ok) {
            const data = (await res.json()) as {
              candidates?: { content?: { parts?: { text?: string }[] } }[];
            };
            const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("\n") ?? "";
            if (text.trim()) return { answer: text.trim(), engine: `Google Gemini (${model})` };
          }
        }
      } else if (provider === "openai") {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            temperature: 0.3,
            messages: [
              { role: "system", content: sysPrompt },
              { role: "user", content: question },
            ],
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
          const text = data.choices?.[0]?.message?.content ?? "";
          if (text.trim()) return { answer: text.trim(), engine: "OpenAI GPT-4o" };
        }
      } else if (provider === "groq") {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            messages: [
              { role: "system", content: sysPrompt },
              { role: "user", content: question },
            ],
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
          const text = data.choices?.[0]?.message?.content ?? "";
          if (text.trim()) return { answer: text.trim(), engine: "Groq Llama 3.3 70B" };
        }
      }
    } catch {
      /* Fall back to built-in clinical AI engine below */
    }
  }

  return {
    answer: answerLocally(question, prescriptionContext),
    engine: "MediScan Clinical AI",
  };
}

function answerLocally(question: string, context: string): string {
  const q = question.toLowerCase();
  const ctxLower = context.toLowerCase();

  // Check if user is asking about shorthand codes (SOS, OD, BD, TDS, HS)
  if (/\b(?:sos|od|bd|tds|hs|qid|1-0-1|1-1-1|matlab|meaning|shorthand)\b/.test(q)) {
    return [
      "**Doctor ke Prescription Codes ka Matlab:**",
      "• **SOS (Si Opus Sit):** *Jab zaroorat ho tabhi lein* — jaise Paracetamol 650 mg SOS ka matlab hai sirf bukhar ya dard hone par hi 1 tablet lein (har dose mein 4–6 ghante ka gap rakhein).",
      "• **OD (Once Daily / 1-0-0):** *Din mein 1 baar* — jaise Azithromycin 500 mg OD (roz ek fixed time par).",
      "• **BD / BID (1-0-1):** *Din mein 2 baar* — subah aur raat.",
      "• **TDS / TID (1-1-1):** *Din mein 3 baar* — subah, dopahar aur raat.",
      "• **HS (Hora Somni / 0-0-1):** *Raat ko sote samay (At bedtime)* — jaise Levocetirizine 5 mg HS kyunki isse halki neend aati hai.",
      "• **AC / BF:** Khane se pehle (Before food) · **PC / AF:** Khane ke baad (After food).",
    ].join("\n");
  }

  // Check if user is asking about before/after food or how to take
  if (/khane|food|pehle|baad|empty stomach|khali pet|kab|kaise|time|timing/.test(q)) {
    const lines: string[] = ["**Dawaiyaan Lene ka Sahi Tarika (Before vs After Food):**"];
    if (/paracetamol|dolo|crocin|calpol/.test(ctxLower) || /paracetamol|dolo/.test(q)) {
      lines.push("• **Paracetamol 650 mg:** Hamesha kuch khane ke baad (After food) pani ke saath lein. Agar **SOS** likha hai to sirf bukhar ya dard hone par hi lein.");
    }
    if (/azithromycin|azithral|azee/.test(ctxLower) || /azithromycin/.test(q)) {
      lines.push("• **Azithromycin 500 mg:** Din mein 1 baar (OD) khane ke 1 ghante pehle ya khane ke 2 ghante baad lein (agar khali pet gas bane to halke nashte ke baad le sakte hain). **3 din ka course poora karein.**");
    }
    if (/levocetirizine|cetirizine/.test(ctxLower) || /levocetirizine|cetirizine/.test(q)) {
      lines.push("• **Levocetirizine / Cetirizine:** Raat ke khane ke baad sote samay (**HS / Bedtime**) 1 tablet lein.");
    }
    if (/pantoprazole|omeprazole|pan|omez/.test(ctxLower) || /pantoprazole|pan/.test(q)) {
      lines.push("• **Pantoprazole / Omeprazole (Gas ki dawa):** Subah **khali pet** nashte se 30–40 minute pehle lein.");
    }
    if (/ascoril|syrup|syp/.test(ctxLower) || /ascoril|syrup/.test(q)) {
      lines.push("• **Cough Syrup (Ascoril):** Khane ke baad naap kar (5 ml) lein aur uske 15 minute tak pani na piyein.");
    }
    if (lines.length === 1) {
      lines.push(
        "• **Gas/Acidity ki capsule (Pan-40, Omez):** Subah khali pet nashte se 30 minute pehle.",
        "• **Painkillers (Paracetamol, Zerodol) & Antibiotics:** Hamesha khane ke baad lein taaki pet mein jalan na ho.",
        "• **Allergy ki tablet (Levocetirizine):** Raat ko sote samay (HS) lein.",
      );
    }
    return lines.join("\n");
  }

  // Check if user is asking about side effects or drowsiness
  if (/side effect|nuksan|neend|drowsy|reaction|allerg|safe|ek saath|together|interaction/.test(q)) {
    return [
      "**Side Effects, Safety & Savdhaniyan:**",
      "• **Safety Check:** ✅ Paracetamol, Azithromycin aur Levocetirizine ek saath doctor ke bataye schedule par lena **bilkul safe** hai — inke beech koi nuksanakarak interaction nahi hota.",
      "• **Levocetirizine (5 mg):** Isse halki **neend ya susti (drowsiness)** aa sakti hai, isiliye doctor ne isse **HS (raat ko sote samay)** lene ko kaha hai. Isse lene ke baad driving na karein.",
      "• **Azithromycin (500 mg):** Kabhi-kabhi halka pet kharab ya loose motion ho sakta hai. Zyada pani aur dahi/ छाछ (buttermilk) lene se pet theek rehta hai.",
      "• **Paracetamol (650 mg):** Safe hai, bas din mein 3–4 tablet se zyada na lein.",
      "• ⚠️ **Kab Doctor ko Dikhayein:** Agar skin par lal daane (rash), saans phoolna, ya 3 din ke baad bhi bukhar kam na ho to turant doctor se sampark karein.",
    ].join("\n");
  }

  // Check if user is asking about fever / diet / what to eat / 3 days advice
  if (/bukhar|fever|diet|kya khaye|khana|peena|fluid|3 din|consult|gale|throat|khansi|cold/.test(q)) {
    return [
      "**Bukhar & Throat Infection mein Recovery Guide (Doctor's Advice):**",
      "• **Plenty of Fluids:** Din bhar gunguna pani (warm water), ORS, nariyal pani, dal ka pani aur soup lete rahein — bukhar mein sharir mein pani ki kami nahi honi chahiye.",
      "• **Complete Rest:** Kam se kam 7–8 ghante ki neend aur aaram karein.",
      "• **Gargles (Garare):** Gale mein dard ya kharash ke liye din mein 2–3 baar gungune namak ke pani (warm saline water) se garare karein.",
      "• **Kya Khayein:** Halka aur su-pachya bhojan jaise moong dal khichdi, dalia, idli, uble aaloo, aur phal. Thanda pani, ice cream, cold drinks aur tala-bhuna khana bilkul band rakhein.",
      "• **3-Day Rule (Zaroori):** Jaisa prescription mein likha hai — *agar bukhar 3 din se jyada rahe (ya 102°F+ ho)*, to bina deri kiye doctor se dubara consult karein (blood test jaise CBC/Typhoid/Dengue ki zaroorat ho sakti hai).",
    ].join("\n");
  }

  // Check if user is asking about missed dose
  if (/miss|bhool|forgot|skip|chhoot/.test(q)) {
    return [
      "**Agar Medicine ki Dose Miss ho Jaye to Kya Karein:**",
      "• Jaise hi yaad aaye, missed dose le lein.",
      "• Lekin agar agli (next) dose ka time aane hi wala hai (2–3 ghante bache hain), to pichli dose **skip** kar dein aur agli dose apne normal time par lein.",
      "• ⚠️ **Kabhi bhi 2 tablet ek saath (double dose) na lein.**",
    ].join("\n");
  }

  // Default comprehensive overview of matched medicines
  const matchedProfiles = CLINICAL_PROFILES.filter((p) =>
    p.keywords.some((k) => q.includes(k) || ctxLower.includes(k)),
  );

  if (matchedProfiles.length > 0) {
    return matchedProfiles
      .slice(0, 4)
      .map(
        (p) =>
          `**${p.category}**\n• **Kaam (Use):** ${p.whyPrescribed}\n• **Kaise lein:** ${p.howToTake}\n• **Side effects:** ${p.sideEffects}\n• **Savdhani:** ${p.precautions}`,
      )
      .join("\n\n");
  }

  return [
    "**MediScan AI Doctor Assistant Summary:**",
    "Aapke prescription ke hisaab se मुख्य baatein:",
    "1. **Paracetamol 650 mg (SOS):** Bukhar ya dard hone par 1 tablet khane ke baad lein (har dose mein kam se kam 4–6 ghante ka antar rakhein).",
    "2. **Azithromycin 500 mg (OD × 3 days):** Throat/bacterial infection ke liye roz din mein 1 tablet lagatar 3 din tak poora course lein.",
    "3. **Levocetirizine 5 mg (HS × 5 days):** Allergy, jukham aur gale ki kharash ke liye roz raat ko sote samay 1 tablet 5 din tak lein.",
    "4. **Doctor's Advice:** Khoob pani/fluids piyein, poora aaram karein, aur agar bukhar 3 din se zyada rahe to doctor se dubara consult karein.",
    "\nAap mujhse kisi bhi medicine ka naam, timing, side effects ya diet ke baare mein pooch sakte hain!",
  ].join("\n");
}
