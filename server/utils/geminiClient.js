const { GoogleGenAI } = require("@google/genai");
const MockMealPlanGenerator = require("./mockMealPlan");

class GeminiClient {
  constructor() {
    this.genAI = null;
    this.modelName = "gemini-2.0-flash";

    // Only initialize if we have a valid API key
    if (
      process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== "your-gemini-api-key-here"
    ) {
      try {
        this.genAI = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
        });
        console.log(
          "GoogleGenAI client initialized with model:",
          this.modelName
        );
      } catch (error) {
        console.warn("Failed to initialize GoogleGenAI:", error.message);
        this.genAI = null;
      }
    } else {
      console.log("No valid GEMINI_API_KEY found, will use mock generator");
    }
  }

  /**
   * Constructs a detailed prompt for meal plan generation based on patient profile.
   * Grounds recommendations in ICMR-NIN 2024 Dietary Guidelines and prioritizes
   * authentic regional Indian foods based on the patient's location.
   * @param {Object} patientProfile - Complete patient profile data
   * @param {number} dayCount - Number of days for meal plan (1-7)
   * @returns {string} - Formatted prompt for Gemini API
   */
  constructPrompt(patientProfile, dayCount = 1) {
    const {
      age,
      height_cm,
      weight_kg,
      bloodPressure,
      bloodGroup,
      medicalSummary,
      diseaseCondition,
      mealPreference,
      allergies = [],
      dislikedItems = [],
      activityLevel,
      healthGoal,
      location = {}
    } = patientProfile;

    // ── BMI & basic caloric estimation ──────────────────────────────
    const bmi = weight_kg / ((height_cm / 100) ** 2);
    const bmiCategory =
      bmi < 18.5 ? "Underweight" :
        bmi < 25 ? "Normal weight" :
          bmi < 30 ? "Overweight" : "Obese";

    // Mifflin-St Jeor BMR (kcal/day)
    const bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5; // male base; adjust if gender known
    const activityMultipliers = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, "very active": 1.9
    };
    const activityKey = (activityLevel || "moderate").toLowerCase();
    const tdee = Math.round(bmr * (activityMultipliers[activityKey] || 1.55));

    // Caloric target adjusted to health goal
    const goalCalories =
      healthGoal?.toLowerCase().includes("weight loss") ? Math.round(tdee * 0.85) :
        healthGoal?.toLowerCase().includes("weight gain") ? Math.round(tdee * 1.15) :
          tdee;

    // ── Location-aware regional cuisine mapping ──────────────────────
    const state = (location.state || "").toLowerCase();
    const city = (location.city || "").toLowerCase();
    const country = (location.country || "India").trim();

    const regionalCuisineMap = {
      // South India
      "tamil nadu": "Tamil Nadu cuisine — idli, dosa, sambar, rasam, kootu, pongal, curd rice, murukku, filter coffee",
      "kerala": "Kerala cuisine — puttu, kadala curry, appam, stew, fish curry (for non-veg), avial, thoran, kanji, payasam",
      "karnataka": "Karnataka cuisine — ragi mudde, bisibelebath, akki roti, jolada roti, saaru, kosambari, rave idli",
      "andhra pradesh": "Andhra cuisine — pesarattu, gongura dal, pulihora, gutti vankaya, pappu, natu kodi pulusu (non-veg option)",
      "telangana": "Telangana cuisine — jonna roti, saggubiyyam ganji, gongura, miriyalu pappu, hyderabadi khichdi",
      // North India
      "punjab": "Punjabi cuisine — sarson da saag with makki di roti, dal makhani, rajma chawal, lassi, paneer tikka, paratha",
      "haryana": "Haryanvi cuisine — bajra khichdi, kachri ki sabzi, singri ki sabzi, churma, rabdi",
      "uttar pradesh": "UP cuisine — dal baati, kachori sabzi, tehri, baingan bharta, petha, chaat",
      "rajasthan": "Rajasthani cuisine — dal baati churma, gatte ki sabzi, ker sangri, bajre ki roti, laal maas (non-veg option)",
      "gujarat": "Gujarati cuisine — dhokla, thepla, khichdi, dal dhokli, undhiyu, rotli, kadhi, handvo",
      "maharashtra": "Maharashtrian cuisine — varan bhaat, pithla bhakri, missal pav, puran poli, thalipeeth, solkadhi",
      // East India
      "west bengal": "Bengali cuisine — dal, bhaat, shukto, machher jhol (non-veg), aloo posto, luchi, sandesh",
      "odisha": "Odia cuisine — dalma, pakhala bhata, santula, saga bhaja, Odia pitha",
      "bihar": "Bihari cuisine — litti chokha, sattu paratha, dal puri, chana ghugni, thekua",
      "assam": "Assamese cuisine — poita bhat, khar, tenga (fish curry for non-veg), masor tenga, xaak",
      // West & Central India
      "madhya pradesh": "MP cuisine — bhutte ka kees, dal bafla, poha, jalebi, seekh kebab (non-veg option)",
      "goa": "Goan cuisine — solkadhi, red rice, seafood (non-veg)/vegetable xacuti, bebinca",
      // Default fallback
      "default": "traditional Indian regional cuisine with whole grains, legumes, seasonal vegetables, and locally available spices"
    };

    const regionalCuisine =
      regionalCuisineMap[state] ||
      regionalCuisineMap[city] ||
      regionalCuisineMap["default"];

    // ── ICMR-NIN 2024 macro targets (% of energy) ────────────────────
    // Carbs: 50–60 %, Protein: 10–15 %, Fat: 20–30 %, Fibre: ≥25 g/day
    const icmrProteinG = Math.round((goalCalories * 0.15) / 4);   // 4 kcal/g
    const icmrCarbsG = Math.round((goalCalories * 0.55) / 4);
    const icmrFatG = Math.round((goalCalories * 0.25) / 9);   // 9 kcal/g
    const icmrFiberG = 25; // minimum g/day per ICMR-NIN 2024

    // ── Disease-specific ICMR dietary restrictions ────────────────────
    const diseaseGuidelines = (() => {
      const d = (diseaseCondition || "").toLowerCase();
      if (d.includes("diabetes") || d.includes("diabetic"))
        return `DIABETES (ICMR): Low glycaemic index (GI<55) foods preferred. Limit refined carbs and added sugars. Increase dietary fibre (≥30 g/day). Distribute carbs evenly across meals. Prefer whole grains (brown rice, millets, whole wheat). Include fenugreek seeds, bitter gourd, drumstick. Avoid white rice in large portions, maida, sugary drinks.`;
      if (d.includes("hypertension") || d.includes("blood pressure") || d.includes("bp"))
        return `HYPERTENSION (ICMR/DASH): Restrict sodium to <2 g/day (use herbs & spices instead of salt). Increase potassium-rich foods (banana, sweet potato, spinach). Include MUFA-rich oils (groundnut, mustard). Avoid pickles, papad, processed foods, excess salt, high-sodium snacks.`;
      if (d.includes("kidney") || d.includes("ckd") || d.includes("renal"))
        return `KIDNEY DISEASE (ICMR): Restrict protein to 0.6–0.8 g/kg body weight. Limit potassium (avoid banana, orange, tomato, potato in large amounts). Limit phosphorus (avoid dairy excess, nuts, cola drinks). Control sodium to <2 g/day. Use dialysis status to adjust fluid restriction.`;
      if (d.includes("heart") || d.includes("cardiac") || d.includes("cardiovascular") || d.includes("cholesterol"))
        return `CARDIOVASCULAR DISEASE (ICMR): Limit saturated fat (<7% energy) and trans fat (0%). Increase omega-3 (flaxseed, walnuts, fish for non-veg). Use MUFA/PUFA-rich oils. Restrict dietary cholesterol (<200 mg/day). Include soluble fibre (oats, barley, legumes). Avoid coconut oil, ghee in excess, fried foods, red meat.`;
      if (d.includes("anaemia") || d.includes("anemia") || d.includes("iron deficiency"))
        return `ANAEMIA (ICMR): Increase haem and non-haem iron sources. Include iron-rich foods: green leafy vegetables (methi, palak), legumes, jaggery, dates, ragi, sesame seeds. Pair iron foods with Vitamin C (amla, lemon, tomato) to enhance absorption. Avoid tea/coffee with meals (reduces iron absorption).`;
      if (d.includes("thyroid") || d.includes("hypothyroid"))
        return `THYROID (ICMR): Limit goitrogenic raw foods (cabbage, cauliflower, broccoli — cooking reduces goitrogens). Ensure adequate iodine via iodised salt. Include selenium-rich foods (Brazil nuts, sunflower seeds). Avoid soy isoflavones in excess around medication time.`;
      if (d.includes("obesity") || d.includes("overweight"))
        return `OBESITY (ICMR): Restrict energy by 500 kcal/day from TDEE. Prioritise high-volume, low-calorie foods (vegetables, soups, salads). Increase protein and dietary fibre for satiety. Avoid refined carbs, fried snacks, sugary beverages, ultra-processed foods.`;
      if (d.includes("uric acid") || d.includes("gout"))
        return `HYPERURICAEMIA/GOUT (ICMR): Low-purine diet — avoid organ meats, shellfish, red meat, beer, high-fructose foods. Include cherries, low-fat dairy, vitamin C-rich fruits. Stay well hydrated (2.5–3 L water/day). Limit spinach, mushroom, cauliflower moderately.`;
      if (d.includes("liver") || d.includes("fatty liver") || d.includes("nafld"))
        return `LIVER DISEASE (ICMR): Limit saturated fat and refined carbs (key drivers of NAFLD). Ensure adequate protein unless in hepatic encephalopathy. Include antioxidant-rich foods (turmeric, green tea, amla). Avoid alcohol entirely. Prefer olive/mustard oil. Include omega-3 sources.`;
      return `GENERAL HEALTH: Follow ICMR-NIN 2024 Balanced Diet recommendations. Ensure wide food-group variety: cereals, legumes, vegetables, fruits, dairy/alternatives, healthy fats. Limit ultra-processed foods, added sugars, and saturated fats.`;
    })();

    // ── Build JSON format strings ─────────────────────────────────────
    let requiredFormat;

    if (dayCount === 1) {
      requiredFormat = `{
  "meals": {
    "breakfast": {
      "items": "detailed breakfast items with exact portions (e.g., 2 idlis with sambar 150ml and coconut chutney 30g)",
      "delivery_search_query": "concise food name for delivery apps (max 3 words)",
      "carbs_g": number,
      "protein_g": number,
      "fat_g": number,
      "fiber_g": number,
      "calories_kcal": number
    },
    "lunch": {
      "items": "detailed lunch items with exact portions",
      "delivery_search_query": "concise food name for delivery apps (max 3 words)",
      "carbs_g": number,
      "protein_g": number,
      "fat_g": number,
      "fiber_g": number,
      "calories_kcal": number
    },
    "snacks": {
      "items": "detailed snack items with exact portions",
      "delivery_search_query": "concise food name for delivery apps (max 3 words)",
      "carbs_g": number,
      "protein_g": number,
      "fat_g": number,
      "fiber_g": number,
      "calories_kcal": number
    },
    "dinner": {
      "items": "detailed dinner items with exact portions",
      "delivery_search_query": "concise food name for delivery apps (max 3 words)",
      "carbs_g": number,
      "protein_g": number,
      "fat_g": number,
      "fiber_g": number,
      "calories_kcal": number
    }
  },
  "summary": {
    "total_calories_kcal": number,
    "total_protein_g": number,
    "total_carbs_g": number,
    "total_fat_g": number
  }
}`;
    } else {
      const dayStructure = Array.from({ length: dayCount }, (_, i) => `    "day${i + 1}": {
      "breakfast": { "items": "detailed items with portions", "delivery_search_query": "concise name", "carbs_g": number, "protein_g": number, "fat_g": number, "fiber_g": number, "calories_kcal": number },
      "lunch":     { "items": "detailed items with portions", "delivery_search_query": "concise name", "carbs_g": number, "protein_g": number, "fat_g": number, "fiber_g": number, "calories_kcal": number },
      "snacks":    { "items": "detailed items with portions", "delivery_search_query": "concise name", "carbs_g": number, "protein_g": number, "fat_g": number, "fiber_g": number, "calories_kcal": number },
      "dinner":    { "items": "detailed items with portions", "delivery_search_query": "concise name", "carbs_g": number, "protein_g": number, "fat_g": number, "fiber_g": number, "calories_kcal": number }
    }`).join(',\n');

      const dailySummaryStructure = Array.from({ length: dayCount }, (_, i) => `    "day${i + 1}": {
      "total_calories_kcal": number,
      "total_protein_g": number,
      "total_carbs_g": number,
      "total_fat_g": number
    }`).join(',\n');

      requiredFormat = `{
  "dailyMeals": {
${dayStructure}
  },
  "dailySummaries": {
${dailySummaryStructure}
  },
  "summary": {
    "total_calories_kcal": number,
    "total_protein_g": number,
    "total_carbs_g": number,
    "total_fat_g": number
  }
}`;
    }

    // ── System role ───────────────────────────────────────────────────
    const systemRole = dayCount === 1
      ? `You are a senior clinical dietitian specialising in evidence-based Indian nutrition. Generate a personalised single-day meal plan strictly following ICMR-NIN 2024 Dietary Guidelines for Indians and using authentic regional Indian foods.`
      : `You are a senior clinical dietitian specialising in evidence-based Indian nutrition. Generate a personalised ${dayCount}-day meal plan strictly following ICMR-NIN 2024 Dietary Guidelines for Indians and using authentic regional Indian foods. Ensure variety across days while maintaining daily nutritional targets.`;

    const fullSystemPrompt = `${systemRole}

IMPORTANT: Respond with ONLY a valid JSON object in the exact format below. No markdown, no explanations, no extra text.

Required JSON format:
${requiredFormat}`;

    // ── Location string ───────────────────────────────────────────────
    const locationInfo = location.country || location.state || location.city
      ? `${location.city || ""}, ${location.state || ""}, ${location.country || "India"}`.replace(/^,\s*|,\s*$/g, "").replace(/,\s*,/g, ",")
      : "India (location not specified)";

    // ── User prompt ───────────────────────────────────────────────────
    let userPrompt = `=== PATIENT PROFILE ===
- Age: ${age} years
- Height: ${height_cm} cm | Weight: ${weight_kg} kg | BMI: ${bmi.toFixed(1)} (${bmiCategory})
- Blood Pressure: ${bloodPressure || "Not specified"}
- Blood Group: ${bloodGroup || "Not specified"}
- Medical Summary: ${medicalSummary || "None provided"}
- Disease / Condition: ${diseaseCondition}
- Meal Preference: ${mealPreference}
- Allergies: ${allergies.length > 0 ? allergies.join(", ") : "None"}
- Disliked Items: ${dislikedItems.length > 0 ? dislikedItems.join(", ") : "None"}
- Activity Level: ${activityLevel}
- Health Goal: ${healthGoal}
- Location: ${locationInfo}

=== CALORIC & MACRO TARGETS (ICMR-NIN 2024) ===
- Estimated TDEE: ${tdee} kcal/day
- Target Calories: ${goalCalories} kcal/day (adjusted for health goal)
- Target Protein: ~${icmrProteinG} g/day  (10–15% of energy)
- Target Carbohydrates: ~${icmrCarbsG} g/day  (50–60% of energy, prefer low-GI)
- Target Fat: ~${icmrFatG} g/day  (20–30% of energy, prefer MUFA/PUFA)
- Minimum Dietary Fibre: ${icmrFiberG} g/day

=== DISEASE-SPECIFIC DIETARY GUIDELINES ===
${diseaseGuidelines}

=== REGIONAL FOOD PREFERENCE ===
Location: ${locationInfo}
Preferred cuisine style: ${regionalCuisine}
- PRIORITISE traditional staples, locally grown grains, legumes, and vegetables of this region.
- Use authentic regional names for dishes (e.g., "Ragi Mudde" not just "Finger millet ball").
- Suggest locally available ingredients and cooking styles (tempering, steaming, pressure cooking).
- Delivery search queries should reflect what this region's food is commonly called on apps like Swiggy/Zomato.`;

    if (dayCount === 1) {
      userPrompt += `

=== MEAL PLAN INSTRUCTIONS (1 DAY) ===
Generate a single-day meal plan that strictly:
1. Meets the ICMR-NIN 2024 caloric and macro targets above.
2. Applies ALL disease-specific dietary restrictions without exception.
3. Avoids every listed allergy and disliked item.
4. Uses authentic ${location.state || "Indian"} regional foods and familiar cooking styles.
5. Respects the meal preference (${mealPreference}) — do NOT include non-${mealPreference} ingredients.
6. Distributes calories sensibly: Breakfast 25%, Lunch 35%, Snacks 15%, Dinner 25%.
7. Includes precise portion sizes (grams/ml/pieces) for every food item.
8. Prefers whole grains (millets, brown rice, oats, whole wheat) over refined grains.
9. Ensures dietary fibre ≥ ${icmrFiberG} g from vegetables, legumes, and whole grains.
10. Uses minimal oil (prefer mustard/groundnut/sunflower oil, ≤3 tsp/day); limit added salt.

Ensure summary totals exactly match the sum of individual meal nutrients (allow ±5 rounding tolerance).`;
    } else {
      userPrompt += `

=== MEAL PLAN INSTRUCTIONS (${dayCount} DAYS) ===
Generate a ${dayCount}-day meal plan that strictly:
1. Meets the ICMR-NIN 2024 caloric and macro targets above for EACH day.
2. Applies ALL disease-specific dietary restrictions every single day without exception.
3. Avoids every listed allergy and disliked item across all days.
4. Uses authentic ${location.state || "Indian"} regional foods and familiar cooking styles.
5. Respects the meal preference (${mealPreference}) — do NOT include non-${mealPreference} ingredients.
6. Distributes calories sensibly each day: Breakfast 25%, Lunch 35%, Snacks 15%, Dinner 25%.
7. Includes precise portion sizes (grams/ml/pieces) for every food item every day.
8. Ensures NO two consecutive days repeat the same main dish in the same meal slot.
9. Rotates millet/grain variety across days (e.g., ragi → jowar → bajra → brown rice).
10. Maintains nutritional consistency day-to-day (±10% of daily targets is acceptable).
11. Uses minimal oil (≤3 tsp/day) and minimal added salt.

Ensure:
- Each day's summary totals exactly match the sum of that day's meal nutrients (±5 tolerance).
- The overall summary exactly matches the sum of all daily summaries (±10 tolerance).
- There is genuine variety: different grains, vegetables, and preparations across days.`;
    }

    return `${fullSystemPrompt}\n\n${userPrompt}`;
  }

  async generateMealPlan(patientProfile, dayCount = 1) {
    // Check if we should use mock data (for development/testing)
    if (
      process.env.NODE_ENV === "development" &&
      process.env.USE_MOCK_MEAL_PLANS === "true"
    ) {
      console.log("Using mock meal plan generator (forced by environment)");
      const mockGenerator = new MockMealPlanGenerator();
      return mockGenerator.generateMealPlan(patientProfile, dayCount);
    }

    // If no Gemini client available, use mock immediately
    if (!this.genAI) {
      console.log(
        "Using mock meal plan generator (no Gemini client available)"
      );
      const mockGenerator = new MockMealPlanGenerator();
      return mockGenerator.generateMealPlan(patientProfile, dayCount);
    }

    try {
      const prompt = this.constructPrompt(patientProfile, dayCount);

      console.log(`Generating ${dayCount}-day meal plan with Gemini API...`);
      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: prompt,
      });

      const text = response.text;
      console.log("Received response from Gemini API");

      // Parse and validate the JSON response
      const mealPlan = this.parseAndValidateResponse(text, dayCount);

      return mealPlan;
    } catch (error) {
      console.error("Gemini API Error:", error);
      console.log("Falling back to mock meal plan generator due to API error");

      // Fallback to mock generator if Gemini fails
      const mockGenerator = new MockMealPlanGenerator();
      return mockGenerator.generateMealPlan(patientProfile, dayCount);
    }
  }

  /**
   * Parses and validates Gemini API response
   * @param {string} responseText - Raw response from Gemini API
   * @param {number} dayCount - Number of days for meal plan
   * @returns {Object} - Validated meal plan object
   */
  parseAndValidateResponse(responseText, dayCount = 1) {
    try {
      // Clean the response text - remove any markdown formatting or extra text
      let cleanedText = responseText.trim();

      // Remove markdown code blocks if present
      cleanedText = cleanedText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "");

      // Find JSON object in the response
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }

      const mealPlan = JSON.parse(jsonMatch[0]);

      // Validate the structure
      this.validateMealPlanStructure(mealPlan, dayCount);

      return mealPlan;
    } catch (error) {
      console.error("Response parsing error:", error);
      console.error("Raw response:", responseText);
      throw new Error(`Failed to parse meal plan response: ${error.message}`);
    }
  }

  /**
   * Validates the structure of the parsed meal plan
   * @param {Object} mealPlan - Parsed meal plan object
   * @param {number} dayCount - Number of days for meal plan
   */
  validateMealPlanStructure(mealPlan, dayCount = 1) {
    if (dayCount === 1) {
      // Single day validation (backward compatibility)
      if (!mealPlan.meals || !mealPlan.summary) {
        throw new Error("Invalid meal plan structure: missing meals or summary");
      }

      // Check required meals
      const requiredMeals = ["breakfast", "lunch", "snacks", "dinner"];
      for (const meal of requiredMeals) {
        if (!mealPlan.meals[meal]) {
          throw new Error(`Missing required meal: ${meal}`);
        }

        const mealData = mealPlan.meals[meal];
        this.validateMealData(mealData, meal);
      }

      // Check summary structure
      this.validateSummaryData(mealPlan.summary);

      // Validate summary totals match individual meals
      const calculatedTotals = {
        total_calories_kcal: Object.values(mealPlan.meals).reduce(
          (sum, meal) => sum + meal.calories_kcal,
          0
        ),
        total_protein_g: Object.values(mealPlan.meals).reduce(
          (sum, meal) => sum + meal.protein_g,
          0
        ),
        total_carbs_g: Object.values(mealPlan.meals).reduce(
          (sum, meal) => sum + meal.carbs_g,
          0
        ),
        total_fat_g: Object.values(mealPlan.meals).reduce(
          (sum, meal) => sum + meal.fat_g,
          0
        ),
      };

      this.validateSummaryTotals(calculatedTotals, mealPlan.summary);
    } else {
      // Multi-day validation
      if (!mealPlan.dailyMeals || !mealPlan.dailySummaries || !mealPlan.summary) {
        throw new Error("Invalid multi-day meal plan structure: missing dailyMeals, dailySummaries, or summary");
      }

      // Check each day's meals
      for (let day = 1; day <= dayCount; day++) {
        const dayKey = `day${day}`;

        if (!mealPlan.dailyMeals[dayKey]) {
          throw new Error(`Missing meals for ${dayKey}`);
        }

        if (!mealPlan.dailySummaries[dayKey]) {
          throw new Error(`Missing summary for ${dayKey}`);
        }

        const dayMeals = mealPlan.dailyMeals[dayKey];
        const requiredMeals = ["breakfast", "lunch", "snacks", "dinner"];

        for (const meal of requiredMeals) {
          if (!dayMeals[meal]) {
            throw new Error(`Missing required meal ${meal} for ${dayKey}`);
          }
          this.validateMealData(dayMeals[meal], `${dayKey}-${meal}`);
        }

        // Validate daily summary
        this.validateSummaryData(mealPlan.dailySummaries[dayKey]);

        // Validate daily summary matches daily meals
        const dailyCalculatedTotals = {
          total_calories_kcal: Object.values(dayMeals).reduce(
            (sum, meal) => sum + meal.calories_kcal,
            0
          ),
          total_protein_g: Object.values(dayMeals).reduce(
            (sum, meal) => sum + meal.protein_g,
            0
          ),
          total_carbs_g: Object.values(dayMeals).reduce(
            (sum, meal) => sum + meal.carbs_g,
            0
          ),
          total_fat_g: Object.values(dayMeals).reduce(
            (sum, meal) => sum + meal.fat_g,
            0
          ),
        };

        this.validateSummaryTotals(dailyCalculatedTotals, mealPlan.dailySummaries[dayKey], dayKey);
      }

      // Validate overall summary matches sum of daily summaries
      const overallCalculatedTotals = {
        total_calories_kcal: 0,
        total_protein_g: 0,
        total_carbs_g: 0,
        total_fat_g: 0
      };

      for (let day = 1; day <= dayCount; day++) {
        const dayKey = `day${day}`;
        const daySummary = mealPlan.dailySummaries[dayKey];
        overallCalculatedTotals.total_calories_kcal += daySummary.total_calories_kcal;
        overallCalculatedTotals.total_protein_g += daySummary.total_protein_g;
        overallCalculatedTotals.total_carbs_g += daySummary.total_carbs_g;
        overallCalculatedTotals.total_fat_g += daySummary.total_fat_g;
      }

      this.validateSummaryTotals(overallCalculatedTotals, mealPlan.summary, 'overall');
    }
  }

  /**
   * Validates individual meal data structure
   * @param {Object} mealData - Individual meal data
   * @param {string} mealName - Name of the meal for error reporting
   */
  validateMealData(mealData, mealName) {
    const requiredFields = [
      "items",
      "delivery_search_query",
      "carbs_g",
      "protein_g",
      "fat_g",
      "fiber_g",
      "calories_kcal",
    ];

    for (const field of requiredFields) {
      if (mealData[field] === undefined || mealData[field] === null) {
        throw new Error(`Missing required field ${field} in ${mealName}`);
      }

      if (
        field !== "items" && field !== "delivery_search_query" &&
        (typeof mealData[field] !== "number" || mealData[field] < 0)
      ) {
        throw new Error(
          `Invalid ${field} value in ${mealName}: must be a non-negative number`
        );
      }
    }
  }

  /**
   * Validates summary data structure
   * @param {Object} summaryData - Summary data object
   */
  validateSummaryData(summaryData) {
    const requiredSummaryFields = [
      "total_calories_kcal",
      "total_protein_g",
      "total_carbs_g",
      "total_fat_g",
    ];

    for (const field of requiredSummaryFields) {
      if (
        summaryData[field] === undefined ||
        summaryData[field] === null
      ) {
        throw new Error(`Missing required summary field: ${field}`);
      }

      if (
        typeof summaryData[field] !== "number" ||
        summaryData[field] < 0
      ) {
        throw new Error(
          `Invalid ${field} value in summary: must be a non-negative number`
        );
      }
    }
  }

  /**
   * Validates summary totals against calculated values
   * @param {Object} calculatedTotals - Calculated totals from meals
   * @param {Object} summaryTotals - Summary totals from response
   * @param {string} context - Context for error reporting
   */
  validateSummaryTotals(calculatedTotals, summaryTotals, context = '') {
    for (const [key, calculatedValue] of Object.entries(calculatedTotals)) {
      const summaryValue = summaryTotals[key];
      const difference = Math.abs(calculatedValue - summaryValue);

      if (difference > 10) {
        // Allow 10-unit tolerance for rounding in multi-day plans
        console.warn(
          `Summary mismatch for ${key} ${context}: calculated ${calculatedValue}, summary ${summaryValue}`
        );
      }
    }
  }
}

module.exports = GeminiClient;
