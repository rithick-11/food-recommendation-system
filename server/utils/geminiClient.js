"use strict";
const Groq = require("groq-sdk");
const MockMealPlanGenerator = require("./mockMealPlan");

// ─────────────────────────────────────────────────────────────────────────────
// JSON Schemas for structured output
// Using best-effort json_schema mode (supported by llama-4-scout)
// ─────────────────────────────────────────────────────────────────────────────

const MEAL_SLOT_SCHEMA = {
  type: "object",
  properties: {
    items: { type: "string" },
    delivery_search_query: { type: "string" },
    carbs_g: { type: "number" },
    protein_g: { type: "number" },
    fat_g: { type: "number" },
    fiber_g: { type: "number" },
    calories_kcal: { type: "number" },
  },
  required: ["items", "delivery_search_query", "carbs_g", "protein_g", "fat_g", "fiber_g", "calories_kcal"],
  additionalProperties: false,
};

const SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    total_calories_kcal: { type: "number" },
    total_protein_g: { type: "number" },
    total_carbs_g: { type: "number" },
    total_fat_g: { type: "number" },
  },
  required: ["total_calories_kcal", "total_protein_g", "total_carbs_g", "total_fat_g"],
  additionalProperties: false,
};

const DAY_MEALS_SCHEMA = {
  type: "object",
  properties: {
    breakfast: MEAL_SLOT_SCHEMA,
    lunch: MEAL_SLOT_SCHEMA,
    snacks: MEAL_SLOT_SCHEMA,
    dinner: MEAL_SLOT_SCHEMA,
  },
  required: ["breakfast", "lunch", "snacks", "dinner"],
  additionalProperties: false,
};

/** Build the response_format schema for 1-day or N-day plans */
function buildResponseFormat(dayCount) {
  if (dayCount === 1) {
    return {
      type: "json_schema",
      json_schema: {
        name: "single_day_meal_plan",
        strict: false, // best-effort; llama-4-scout supports this
        schema: {
          type: "object",
          properties: {
            meals: DAY_MEALS_SCHEMA,
            summary: SUMMARY_SCHEMA,
          },
          required: ["meals", "summary"],
          additionalProperties: false,
        },
      },
    };
  }

  // Multi-day: build dailyMeals and dailySummaries dynamically
  const dailyMealsProps = {};
  const dailySummariesProps = {};
  const dayKeys = [];

  for (let d = 1; d <= dayCount; d++) {
    const k = `day${d}`;
    dayKeys.push(k);
    dailyMealsProps[k] = DAY_MEALS_SCHEMA;
    dailySummariesProps[k] = SUMMARY_SCHEMA;
  }

  return {
    type: "json_schema",
    json_schema: {
      name: "multi_day_meal_plan",
      strict: false,
      schema: {
        type: "object",
        properties: {
          dailyMeals: {
            type: "object",
            properties: dailyMealsProps,
            required: dayKeys,
            additionalProperties: false,
          },
          dailySummaries: {
            type: "object",
            properties: dailySummariesProps,
            required: dayKeys,
            additionalProperties: false,
          },
          summary: SUMMARY_SCHEMA,
        },
        required: ["dailyMeals", "dailySummaries", "summary"],
        additionalProperties: false,
      },
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GeminiClient  (name kept so no imports need updating)
// ─────────────────────────────────────────────────────────────────────────────
class GeminiClient {
  constructor() {
    this.groq = null;
    // Model selection with json_schema compatibility check:
    // - meta-llama/llama-4-scout-17b-16e-instruct → supports json_schema (best-effort)
    // - llama-3.3-70b-versatile                   → only supports json_object, NOT json_schema
    const requestedModel = process.env.GROQ_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
    const JSON_SCHEMA_UNSUPPORTED = ["llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768", "gemma2-9b-it"];
    if (JSON_SCHEMA_UNSUPPORTED.includes(requestedModel)) {
      console.warn(`⚠ Model "${requestedModel}" does not support json_schema. Switching to meta-llama/llama-4-scout-17b-16e-instruct.`);
      this.modelName = "meta-llama/llama-4-scout-17b-16e-instruct";
    } else {
      this.modelName = requestedModel;
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey && apiKey !== "your-groq-api-key-here") {
      try {
        this.groq = new Groq({ apiKey });
        console.log("Groq client initialized with model:", this.modelName);
      } catch (err) {
        console.warn("Failed to initialize Groq client:", err.message);
        this.groq = null;
      }
    } else {
      console.log("No valid GROQ_API_KEY found — will use mock generator");
    }
  }

  // ── Prompt construction ──────────────────────────────────────────
  constructMessages(patientProfile, dayCount = 1) {
    const {
      age, height_cm, weight_kg,
      bloodPressure, bloodGroup, medicalSummary,
      diseaseCondition, mealPreference,
      allergies = [], dislikedItems = [],
      activityLevel, healthGoal,
      location = {},
    } = patientProfile;

    // ── BMI & caloric targets ──────────────────────────────────────
    const bmi = weight_kg / ((height_cm / 100) ** 2);
    const bmiCategory =
      bmi < 18.5 ? "Underweight" :
        bmi < 25 ? "Normal weight" :
          bmi < 30 ? "Overweight" : "Obese";
    const bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;

    const activityMultipliers = {
      sedentary: 1.2, light: 1.375, "lightly active": 1.375,
      moderate: 1.55, "moderately active": 1.55,
      active: 1.725, "very active": 1.9,
    };
    const tdee = Math.round(bmr * (activityMultipliers[(activityLevel || "moderate").toLowerCase()] || 1.55));
    const goalCalories =
      healthGoal?.toLowerCase().includes("weight loss") ? Math.round(tdee * 0.85) :
        healthGoal?.toLowerCase().includes("weight gain") ? Math.round(tdee * 1.15) : tdee;

    const icmrProteinG = Math.round((goalCalories * 0.15) / 4);
    const icmrCarbsG = Math.round((goalCalories * 0.55) / 4);
    const icmrFatG = Math.round((goalCalories * 0.25) / 9);
    const icmrFiberG = 25;

    // ── Regional cuisine mapping ───────────────────────────────────
    const state = (location.state || "").toLowerCase();
    const city = (location.city || "").toLowerCase();
    const regionalCuisineMap = {
      "tamil nadu": "Tamil Nadu — idli, dosa, sambar, rasam, kootu, pongal, curd rice, filter coffee",
      "kerala": "Kerala — puttu, kadala curry, appam, stew, avial, thoran, kanji",
      "karnataka": "Karnataka — ragi mudde, bisibelebath, akki roti, jolada roti, saaru, kosambari",
      "andhra pradesh": "Andhra — pesarattu, gongura dal, pulihora, gutti vankaya, pappu",
      "telangana": "Telangana — jonna roti, saggubiyyam ganji, gongura, miriyalu pappu",
      "punjab": "Punjab — sarson da saag, makki di roti, dal makhani, rajma chawal, lassi",
      "gujarat": "Gujarat — dhokla, thepla, khichdi, dal dhokli, undhiyu, rotli, kadhi",
      "maharashtra": "Maharashtra — varan bhaat, pithla bhakri, missal pav, thalipeeth",
      "west bengal": "Bengal — dal bhaat, shukto, aloo posto, luchi",
      "rajasthan": "Rajasthan — dal baati churma, gatte ki sabzi, ker sangri, bajre ki roti",
      "default": "traditional Indian cuisine — whole grains, legumes, seasonal vegetables",
    };
    const regionalCuisine = regionalCuisineMap[state] || regionalCuisineMap[city] || regionalCuisineMap["default"];

    // ── Disease guidelines (concise) ──────────────────────────────
    const d = (diseaseCondition || "").toLowerCase();
    const diseaseGuidelines =
      d.includes("diabetes") || d.includes("diabetic")
        ? "Low-GI (GI<55), fibre ≥30g, avoid maida/sugary drinks, include millets."
        : d.includes("hypertension") || d.includes("bp")
          ? "Sodium <2g/day, potassium-rich foods, avoid pickles/papad/processed food."
          : d.includes("kidney") || d.includes("ckd") || d.includes("renal")
            ? "Protein 0.6–0.8g/kg, limit potassium & phosphorus, sodium <2g/day."
            : d.includes("heart") || d.includes("cardiac") || d.includes("cholesterol")
              ? "Sat fat <7%, zero trans fat, omega-3 sources, soluble fibre, no fried food."
              : d.includes("anaemia") || d.includes("anemia")
                ? "Iron-rich foods (methi, ragi, jaggery), pair with Vit C, avoid tea with meals."
                : d.includes("obesity") || d.includes("overweight")
                  ? "Restrict ~500kcal/day, high-volume low-calorie foods, avoid refined carbs."
                  : d.includes("gout") || d.includes("uric acid")
                    ? "Low-purine, avoid organ meats/shellfish, hydrate 2.5–3L/day."
                    : d.includes("liver") || d.includes("fatty liver")
                      ? "Limit sat fat & refined carbs, antioxidants (turmeric, amla), no alcohol."
                      : "Balanced ICMR-NIN 2024 diet — variety, limit ultra-processed foods.";

    const locationInfo = [location.city, location.state, location.country || "India"]
      .filter(Boolean).join(", ");

    // ── System message ─────────────────────────────────────────────
    const systemMessage =
      `You are a clinical dietitian. Generate a ${dayCount === 1 ? "single-day" : `${dayCount}-day`} ` +
      `Indian meal plan following ICMR-NIN 2024 guidelines. ` +
      `Return ONLY the JSON object matching the provided schema — no markdown, no extra text.`;

    // ── User message (compact) ─────────────────────────────────────
    const userMessage =
      `PATIENT: Age ${age}y | ${height_cm}cm | ${weight_kg}kg | BMI ${bmi.toFixed(1)} (${bmiCategory})
BP: ${bloodPressure || "N/A"} | Blood Group: ${bloodGroup || "N/A"}
Condition: ${diseaseCondition} | Preference: ${mealPreference}
Allergies: ${allergies.length ? allergies.join(", ") : "None"}
Dislikes: ${dislikedItems.length ? dislikedItems.join(", ") : "None"}
Activity: ${activityLevel} | Goal: ${healthGoal} | Location: ${locationInfo}

TARGETS (ICMR-NIN 2024):
Calories: ${goalCalories} kcal | Protein: ${icmrProteinG}g | Carbs: ${icmrCarbsG}g | Fat: ${icmrFatG}g | Fibre: ≥${icmrFiberG}g
Distribution: Breakfast 25% | Lunch 35% | Snacks 15% | Dinner 25%

DISEASE GUIDELINES: ${diseaseGuidelines}
CUISINE: ${regionalCuisine}

RULES:
1. Use authentic regional dish names with exact portion sizes (g/ml/pieces).
2. No ${mealPreference === "Vegetarian" ? "meat/fish/eggs" : "ingredients outside preference"}.
3. Avoid all allergens and disliked items.
4. Prefer whole grains over refined. Oil ≤3 tsp/day. Minimal salt.
5. Delivery search queries must be Swiggy/Zomato searchable and make sure it should available on respective location.
${dayCount > 1 ? "6. No repeated main dish in same slot on consecutive days.\n7. Rotate grains: ragi → jowar → bajra → brown rice." : ""}
Summary totals must equal sum of all meal nutrients (±5 tolerance).`;

    return { systemMessage, userMessage };
  }

  // ── Legacy alias ─────────────────────────────────────────────────
  constructPrompt(patientProfile, dayCount = 1) {
    const { systemMessage, userMessage } = this.constructMessages(patientProfile, dayCount);
    return `${systemMessage}\n\n${userMessage}`;
  }

  // ── Main generation method ────────────────────────────────────────
  async generateMealPlan(patientProfile, dayCount = 1) {
    if (process.env.NODE_ENV === "development" && process.env.USE_MOCK_MEAL_PLANS === "true") {
      console.log("Using mock meal plan generator (forced by environment)");
      return new MockMealPlanGenerator().generateMealPlan(patientProfile, dayCount);
    }

    if (!this.groq) {
      console.log("Using mock meal plan generator (no Groq client available)");
      return new MockMealPlanGenerator().generateMealPlan(patientProfile, dayCount);
    }

    try {
      const { systemMessage, userMessage } = this.constructMessages(patientProfile, dayCount);
      const responseFormat = buildResponseFormat(dayCount);

      console.log(`Generating ${dayCount}-day meal plan with Groq API (${this.modelName}) using json_schema mode…`);

      const response = await this.groq.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        response_format: responseFormat,
        temperature: 0.4,
        max_tokens: 8192,
      });

      const rawText = response.choices[0]?.message?.content || "";
      if (!rawText.trim()) throw new Error("Empty response from Groq API");

      console.log("Received response from Groq API");
      return this.parseAndValidateResponse(rawText, dayCount);

    } catch (error) {
      console.error("Groq API Error:", error.message);
      console.log("Falling back to mock meal plan generator");
      return new MockMealPlanGenerator().generateMealPlan(patientProfile, dayCount);
    }
  }

  // ── Response parsing ──────────────────────────────────────────────
  parseAndValidateResponse(responseText, dayCount = 1) {
    try {
      const cleaned = responseText.trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/, "");

      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No valid JSON found in response");

      const mealPlan = JSON.parse(jsonMatch[0]);
      this.validateMealPlanStructure(mealPlan, dayCount);
      return mealPlan;

    } catch (err) {
      console.error("Response parsing error:", err.message);
      throw new Error(`Failed to parse meal plan response: ${err.message}`);
    }
  }

  // ── Structure validation ──────────────────────────────────────────
  validateMealPlanStructure(mealPlan, dayCount = 1) {
    if (dayCount === 1) {
      if (!mealPlan.meals || !mealPlan.summary)
        throw new Error("Invalid structure: missing meals or summary");
      for (const meal of ["breakfast", "lunch", "snacks", "dinner"]) {
        if (!mealPlan.meals[meal]) throw new Error(`Missing meal: ${meal}`);
        this.validateMealData(mealPlan.meals[meal], meal);
      }
      this.validateSummaryData(mealPlan.summary);
      this.validateSummaryTotals(
        {
          total_calories_kcal: Object.values(mealPlan.meals).reduce((s, m) => s + m.calories_kcal, 0),
          total_protein_g: Object.values(mealPlan.meals).reduce((s, m) => s + m.protein_g, 0),
          total_carbs_g: Object.values(mealPlan.meals).reduce((s, m) => s + m.carbs_g, 0),
          total_fat_g: Object.values(mealPlan.meals).reduce((s, m) => s + m.fat_g, 0),
        },
        mealPlan.summary
      );
    } else {
      if (!mealPlan.dailyMeals || !mealPlan.dailySummaries || !mealPlan.summary)
        throw new Error("Invalid multi-day structure: missing dailyMeals, dailySummaries or summary");

      for (let day = 1; day <= dayCount; day++) {
        const key = `day${day}`;
        if (!mealPlan.dailyMeals[key]) throw new Error(`Missing meals for ${key}`);
        if (!mealPlan.dailySummaries[key]) throw new Error(`Missing summary for ${key}`);

        const dayMeals = mealPlan.dailyMeals[key];
        for (const meal of ["breakfast", "lunch", "snacks", "dinner"]) {
          if (!dayMeals[meal]) throw new Error(`Missing ${meal} for ${key}`);
          this.validateMealData(dayMeals[meal], `${key}-${meal}`);
        }
        this.validateSummaryData(mealPlan.dailySummaries[key]);
        this.validateSummaryTotals(
          {
            total_calories_kcal: Object.values(dayMeals).reduce((s, m) => s + m.calories_kcal, 0),
            total_protein_g: Object.values(dayMeals).reduce((s, m) => s + m.protein_g, 0),
            total_carbs_g: Object.values(dayMeals).reduce((s, m) => s + m.carbs_g, 0),
            total_fat_g: Object.values(dayMeals).reduce((s, m) => s + m.fat_g, 0),
          },
          mealPlan.dailySummaries[key], key
        );
      }

      const overall = { total_calories_kcal: 0, total_protein_g: 0, total_carbs_g: 0, total_fat_g: 0 };
      for (let day = 1; day <= dayCount; day++) {
        const ds = mealPlan.dailySummaries[`day${day}`];
        overall.total_calories_kcal += ds.total_calories_kcal;
        overall.total_protein_g += ds.total_protein_g;
        overall.total_carbs_g += ds.total_carbs_g;
        overall.total_fat_g += ds.total_fat_g;
      }
      this.validateSummaryTotals(overall, mealPlan.summary, "overall");
    }
  }

  validateMealData(mealData, mealName) {
    const fields = ["items", "delivery_search_query", "carbs_g", "protein_g", "fat_g", "fiber_g", "calories_kcal"];
    for (const f of fields) {
      if (mealData[f] === undefined || mealData[f] === null)
        throw new Error(`Missing required field "${f}" in ${mealName}`);
      if (f !== "items" && f !== "delivery_search_query") {
        if (typeof mealData[f] !== "number" || mealData[f] < 0)
          throw new Error(`Invalid "${f}" in ${mealName}: must be a non-negative number`);
      }
    }
  }

  validateSummaryData(s) {
    for (const f of ["total_calories_kcal", "total_protein_g", "total_carbs_g", "total_fat_g"]) {
      if (s[f] === undefined || s[f] === null) throw new Error(`Missing summary field: ${f}`);
      if (typeof s[f] !== "number" || s[f] < 0) throw new Error(`Invalid summary field "${f}"`);
    }
  }

  validateSummaryTotals(calculated, summary, context = "") {
    for (const [key, calcVal] of Object.entries(calculated)) {
      if (Math.abs(calcVal - summary[key]) > 10) {
        console.warn(`[Summary mismatch${context ? " – " + context : ""}] ${key}: calculated=${calcVal}, reported=${summary[key]}`);
      }
    }
  }
}

module.exports = GeminiClient;
