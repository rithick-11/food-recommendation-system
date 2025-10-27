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
   * @returns {string} - Formatted prompt for Gemini API
   */
  constructPrompt(patientProfile) {
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

    const systemPrompt = `You are an expert dietitian and nutritionist. Generate a personalized daily meal plan based on the patient's health profile. 

IMPORTANT: You must respond with ONLY a valid JSON object in the exact format specified below. Do not include any explanations, markdown formatting, or additional text.

Required JSON format:
{
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

    const locationInfo = location.country || location.state || location.city 
      ? `${location.country || 'Not specified'}, ${location.state || 'Not specified'}, ${location.city || 'Not specified'}`
      : 'Not specified';

    const userPrompt = `Patient Profile:
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
- Location: ${locationInfo}

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

    return `${systemPrompt}\n\n${userPrompt}`;
  }

  async generateMealPlan(patientProfile) {
    // Check if we should use mock data (for development/testing)
    if (
      process.env.NODE_ENV === "development" &&
      process.env.USE_MOCK_MEAL_PLANS === "true"
    ) {
      console.log("Using mock meal plan generator (forced by environment)");
      const mockGenerator = new MockMealPlanGenerator();
      return mockGenerator.generateMealPlan(patientProfile);
    }

    // If no Gemini client available, use mock immediately
    if (!this.genAI) {
      console.log(
        "Using mock meal plan generator (no Gemini client available)"
      );
      const mockGenerator = new MockMealPlanGenerator();
      return mockGenerator.generateMealPlan(patientProfile);
    }

    try {
      const prompt = this.constructPrompt(patientProfile);

      console.log("Generating meal plan with Gemini API...");
      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: prompt,
      });

      const text = response.text;
      console.log("Received response from Gemini API");

      // Parse and validate the JSON response
      const mealPlan = this.parseAndValidateResponse(text);

      return mealPlan;
    } catch (error) {
      console.error("Gemini API Error:", error);
      console.log("Falling back to mock meal plan generator due to API error");

      // Fallback to mock generator if Gemini fails
      const mockGenerator = new MockMealPlanGenerator();
      return mockGenerator.generateMealPlan(patientProfile);
    }
  }

  /**
   * Parses and validates Gemini API response
   * @param {string} responseText - Raw response from Gemini API
   * @returns {Object} - Validated meal plan object
   */
  parseAndValidateResponse(responseText) {
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
      this.validateMealPlanStructure(mealPlan);

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
   */
  validateMealPlanStructure(mealPlan) {
    // Check main structure
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
          throw new Error(`Missing required field ${field} in ${meal}`);
        }

        if (
          field !== "items" &&
          (typeof mealData[field] !== "number" || mealData[field] < 0)
        ) {
          throw new Error(
            `Invalid ${field} value in ${meal}: must be a non-negative number`
          );
        }
      }
    }

    // Check summary structure
    const requiredSummaryFields = [
      "total_calories_kcal",
      "total_protein_g",
      "total_carbs_g",
      "total_fat_g",
    ];
    for (const field of requiredSummaryFields) {
      if (
        mealPlan.summary[field] === undefined ||
        mealPlan.summary[field] === null
      ) {
        throw new Error(`Missing required summary field: ${field}`);
      }

      if (
        typeof mealPlan.summary[field] !== "number" ||
        mealPlan.summary[field] < 0
      ) {
        throw new Error(
          `Invalid ${field} value in summary: must be a non-negative number`
        );
      }
    }

    // Validate summary totals match individual meals (with small tolerance for rounding)
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

    for (const [key, calculatedValue] of Object.entries(calculatedTotals)) {
      const summaryValue = mealPlan.summary[key];
      const difference = Math.abs(calculatedValue - summaryValue);

      if (difference > 5) {
        // Allow 5-unit tolerance for rounding
        console.warn(
          `Summary mismatch for ${key}: calculated ${calculatedValue}, summary ${summaryValue}`
        );
      }
    }
  }
}

module.exports = GeminiClient;
