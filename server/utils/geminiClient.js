const { GoogleGenAI } = require("@google/genai");
const MockMealPlanGenerator = require("./mockMealPlan");

class GeminiClient {
  constructor() {
    this.genAI = null;
    this.modelName = "gemini-2.0-flash-exp";

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
   * Constructs a detailed prompt for meal plan generation based on patient profile
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

    let systemPrompt, requiredFormat;

    if (dayCount === 1) {
      // Single day format (backward compatibility)
      systemPrompt = `You are an expert dietitian and nutritionist. Generate a personalized daily meal plan based on the patient's health profile.`;
      requiredFormat = `{
  "meals": {
    "breakfast": {
      "items": "detailed breakfast items with portions",
      "carbs_g": number,
      "protein_g": number,
      "fat_g": number,
      "fiber_g": number,
      "calories_kcal": number
    },
    "lunch": {
      "items": "detailed lunch items with portions",
      "carbs_g": number,
      "protein_g": number,
      "fat_g": number,
      "fiber_g": number,
      "calories_kcal": number
    },
    "snacks": {
      "items": "detailed snack items with portions",
      "carbs_g": number,
      "protein_g": number,
      "fat_g": number,
      "fiber_g": number,
      "calories_kcal": number
    },
    "dinner": {
      "items": "detailed dinner items with portions",
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
      // Multi-day format
      systemPrompt = `You are an expert dietitian and nutritionist. Generate a personalized ${dayCount}-day meal plan based on the patient's health profile. Ensure variety across days while maintaining nutritional consistency.`;
      
      const dayStructure = Array.from({length: dayCount}, (_, i) => `    "day${i + 1}": {
      "breakfast": { "items": "detailed breakfast items with portions", "carbs_g": number, "protein_g": number, "fat_g": number, "fiber_g": number, "calories_kcal": number },
      "lunch": { "items": "detailed lunch items with portions", "carbs_g": number, "protein_g": number, "fat_g": number, "fiber_g": number, "calories_kcal": number },
      "snacks": { "items": "detailed snack items with portions", "carbs_g": number, "protein_g": number, "fat_g": number, "fiber_g": number, "calories_kcal": number },
      "dinner": { "items": "detailed dinner items with portions", "carbs_g": number, "protein_g": number, "fat_g": number, "fiber_g": number, "calories_kcal": number }
    }`).join(',\n');

      const dailySummaryStructure = Array.from({length: dayCount}, (_, i) => `    "day${i + 1}": {
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

    const fullSystemPrompt = `${systemPrompt}

IMPORTANT: You must respond with ONLY a valid JSON object in the exact format specified below. Do not include any explanations, markdown formatting, or additional text.

Required JSON format:
${requiredFormat}`;

    const locationInfo = location.country || location.state || location.city 
      ? `${location.country || 'Not specified'}, ${location.state || 'Not specified'}, ${location.city || 'Not specified'}`
      : 'Not specified';

    let userPrompt = `Patient Profile:
- Age: ${age} years
- Height: ${height_cm} cm
- Weight: ${weight_kg} kg
- Blood Pressure: ${bloodPressure || "Not specified"}
- Blood Group: ${bloodGroup || "Not specified"}
- Medical Summary: ${medicalSummary || "None provided"}
- Disease/Condition: ${diseaseCondition}
- Meal Preference: ${mealPreference}
- Allergies: ${allergies.length > 0 ? allergies.join(", ") : "None"}
- Disliked Items: ${
      dislikedItems.length > 0 ? dislikedItems.join(", ") : "None"
    }
- Activity Level: ${activityLevel}
- Health Goal: ${healthGoal}
- Location: ${locationInfo}`;

    if (dayCount === 1) {
      userPrompt += `

Generate a balanced daily meal plan that:
1. Addresses the specific disease condition and health goal
2. Respects dietary preferences and restrictions
3. Avoids all listed allergies and disliked items
4. Matches the activity level and caloric needs
5. Incorporates regional/local cuisines and ingredients based on the location
6. Uses locally available and culturally appropriate foods
7. Provides detailed food items with specific portions
8. Includes accurate nutritional calculations

Ensure the summary totals match the sum of individual meal nutrients.`;
    } else {
      userPrompt += `

Generate a balanced ${dayCount}-day meal plan that:
1. Addresses the specific disease condition and health goal
2. Respects dietary preferences and restrictions
3. Avoids all listed allergies and disliked items
4. Matches the activity level and caloric needs
5. Incorporates regional/local cuisines and ingredients based on the location
6. Uses locally available and culturally appropriate foods
7. Provides variety across days while maintaining nutritional consistency
8. Ensures each day has balanced nutrition appropriate for the health goal
9. Provides detailed food items with specific portions for each day
10. Includes accurate nutritional calculations for each day and overall totals

Ensure:
- Each daily summary matches the sum of that day's individual meal nutrients
- The overall summary matches the sum of all daily summaries
- There is variety in meals across different days
- Nutritional consistency is maintained throughout the plan`;
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
        field !== "items" &&
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
