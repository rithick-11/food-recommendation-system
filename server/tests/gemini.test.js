"use strict";
const GeminiClient = require("../utils/geminiClient");

// ── Mock groq-sdk ─────────────────────────────────────────────────────────────
// The GeminiClient now uses `new Groq({ apiKey })` and calls
// `this.groq.chat.completions.create(...)` which returns
// `{ choices: [{ message: { content: "<JSON string>" } }] }`
jest.mock("groq-sdk", () => {
  const mockCreate = jest.fn();
  const MockGroq = jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
  MockGroq._mockCreate = mockCreate; // expose for test access
  return MockGroq;
});

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Wrap a plain-object meal plan as a Groq API response */
function mockGroqResponse(mealPlanObj) {
  return { choices: [{ message: { content: JSON.stringify(mealPlanObj) } }] };
}

const validSingleDayPlan = {
  meals: {
    breakfast: { items: "Oatmeal with berries", delivery_search_query: "Oatmeal berries", carbs_g: 45, protein_g: 8, fat_g: 6, fiber_g: 7, calories_kcal: 280 },
    lunch:     { items: "Grilled chicken salad", delivery_search_query: "Chicken salad", carbs_g: 35, protein_g: 30, fat_g: 12, fiber_g: 8, calories_kcal: 350 },
    snacks:    { items: "Greek yogurt with almonds", delivery_search_query: "Greek yogurt", carbs_g: 15, protein_g: 12, fat_g: 8, fiber_g: 2, calories_kcal: 180 },
    dinner:    { items: "Baked salmon with vegetables", delivery_search_query: "Baked salmon", carbs_g: 25, protein_g: 35, fat_g: 15, fiber_g: 6, calories_kcal: 380 },
  },
  summary: { total_calories_kcal: 1190, total_protein_g: 85, total_carbs_g: 120, total_fat_g: 41 },
};

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("GeminiClient (Groq backend)", () => {
  let client;
  let mockCreate;

  const sampleProfile = {
    age: 30, height_cm: 170, weight_kg: 70,
    bloodPressure: "120/80", bloodGroup: "O+",
    medicalSummary: "Generally healthy",
    diseaseCondition: "Type 2 Diabetes",
    mealPreference: "Vegetarian",
    allergies: ["nuts", "shellfish"],
    dislikedItems: ["broccoli", "spinach"],
    activityLevel: "Moderately Active",
    healthGoal: "Weight Maintenance",
    location: { country: "India", state: "Tamil Nadu", city: "Chennai" },
  };

  beforeAll(() => {
    process.env.GROQ_API_KEY = "test-groq-api-key";
    process.env.GROQ_MODEL   = "llama-3.3-70b-versatile";
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const Groq = require("groq-sdk");
    client     = new GeminiClient();
    mockCreate = Groq._mockCreate;
  });

  afterAll(() => {
    delete process.env.GROQ_API_KEY;
    delete process.env.GROQ_MODEL;
  });

  // ── Constructor ─────────────────────────────────────────────────
  describe("Constructor", () => {
    it("initialises groq client when GROQ_API_KEY is set", () => {
      expect(client.groq).not.toBeNull();
      expect(client.modelName).toBe("llama-3.3-70b-versatile");
    });

    it("sets groq to null when API key is missing", () => {
      const savedKey = process.env.GROQ_API_KEY;
      delete process.env.GROQ_API_KEY;
      jest.clearAllMocks();
      const c = new GeminiClient();
      expect(c.groq).toBeNull();
      process.env.GROQ_API_KEY = savedKey;
    });

    it("sets groq to null when API key is the placeholder", () => {
      process.env.GROQ_API_KEY = "your-groq-api-key-here";
      jest.clearAllMocks();
      const c = new GeminiClient();
      expect(c.groq).toBeNull();
      process.env.GROQ_API_KEY = "test-groq-api-key";
    });
  });

  // ── constructMessages / constructPrompt ─────────────────────────
  describe("constructMessages", () => {
    it("includes patient profile fields in the user message", () => {
      const { userMessage } = client.constructMessages(sampleProfile);
      expect(userMessage).toContain("Age: 30 years");
      expect(userMessage).toContain("170 cm");
      expect(userMessage).toContain("70 kg");
      expect(userMessage).toContain("120/80");
      expect(userMessage).toContain("O+");
      expect(userMessage).toContain("Type 2 Diabetes");
      expect(userMessage).toContain("Vegetarian");
      expect(userMessage).toContain("nuts, shellfish");
      expect(userMessage).toContain("broccoli, spinach");
      expect(userMessage).toContain("Moderately Active");
      expect(userMessage).toContain("Weight Maintenance");
    });

    it("injects ICMR diabetes guidelines for diabetic patient", () => {
      const { userMessage } = client.constructMessages(sampleProfile);
      expect(userMessage).toContain("DIABETES (ICMR)");
      expect(userMessage).toContain("Low-GI");
    });

    it("injects ICMR hypertension guidelines for hypertensive patient", () => {
      const { userMessage } = client.constructMessages({ ...sampleProfile, diseaseCondition: "Hypertension (High Blood Pressure)" });
      expect(userMessage).toContain("HYPERTENSION (ICMR");
    });

    it("includes regional Tamil Nadu cuisine hint", () => {
      const { userMessage } = client.constructMessages(sampleProfile);
      expect(userMessage).toContain("Tamil Nadu");
    });

    it("includes ICMR caloric targets in user message", () => {
      const { userMessage } = client.constructMessages(sampleProfile);
      expect(userMessage).toContain("Target Calories");
      expect(userMessage).toContain("Target Protein");
    });

    it("constructPrompt (legacy alias) returns non-empty string", () => {
      const prompt = client.constructPrompt(sampleProfile);
      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(100);
    });
  });

  // ── parseAndValidateResponse ────────────────────────────────────
  describe("parseAndValidateResponse", () => {
    it("parses a valid JSON response correctly", () => {
      const result = client.parseAndValidateResponse(JSON.stringify(validSingleDayPlan));
      expect(result).toEqual(validSingleDayPlan);
    });

    it("strips markdown fences if accidentally present", () => {
      const fenced = "```json\n" + JSON.stringify(validSingleDayPlan) + "\n```";
      const result = client.parseAndValidateResponse(fenced);
      expect(result).toEqual(validSingleDayPlan);
    });

    it("extracts JSON from mixed-content response", () => {
      const mixed = "Here is your plan:\n" + JSON.stringify(validSingleDayPlan) + "\nEnjoy!";
      const result = client.parseAndValidateResponse(mixed);
      expect(result).toEqual(validSingleDayPlan);
    });

    it("throws when no JSON found", () => {
      expect(() => client.parseAndValidateResponse("No JSON here")).toThrow("No valid JSON found in response");
    });

    it("throws for missing required meal", () => {
      const bad = { meals: { breakfast: validSingleDayPlan.meals.breakfast, lunch: validSingleDayPlan.meals.lunch }, summary: validSingleDayPlan.summary };
      expect(() => client.parseAndValidateResponse(JSON.stringify(bad))).toThrow("Missing required meal: snacks");
    });

    it("throws for missing nutritional field", () => {
      const bad = JSON.parse(JSON.stringify(validSingleDayPlan));
      delete bad.meals.breakfast.fat_g;
      expect(() => client.parseAndValidateResponse(JSON.stringify(bad))).toThrow("Missing required field fat_g in breakfast");
    });

    it("throws for negative nutritional value", () => {
      const bad = JSON.parse(JSON.stringify(validSingleDayPlan));
      bad.meals.breakfast.calories_kcal = -100;
      expect(() => client.parseAndValidateResponse(JSON.stringify(bad))).toThrow("Invalid calories_kcal value in breakfast: must be a non-negative number");
    });
  });

  // ── generateMealPlan ────────────────────────────────────────────
  describe("generateMealPlan", () => {
    it("generates a single-day meal plan on success", async () => {
      mockCreate.mockClear();
      mockCreate.mockResolvedValueOnce(mockGroqResponse(validSingleDayPlan));
      const result = await client.generateMealPlan(sampleProfile, 1);
      expect(result).toEqual(validSingleDayPlan);
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });



    it("sends system + user messages to the API", async () => {
      mockCreate.mockClear();
      mockCreate.mockResolvedValueOnce(mockGroqResponse(validSingleDayPlan));
      await client.generateMealPlan(sampleProfile, 1);

      const { messages } = mockCreate.mock.calls[0][0];
      expect(messages[0].role).toBe("system");
      expect(messages[1].role).toBe("user");
      expect(messages[1].content).toContain("Type 2 Diabetes");
      expect(messages[1].content).toContain("ONLY a valid JSON object");
    });

    it("falls back to mock on API error", async () => {
      mockCreate.mockRejectedValue(new Error("Rate limit exceeded"));
      const result = await client.generateMealPlan(sampleProfile, 1);
      expect(result).toBeDefined();
      expect(result.meals || result.dailyMeals).toBeDefined();
    });

    it("falls back to mock when groq client is null", async () => {
      const noKeyClient = new GeminiClient();
      noKeyClient.groq = null;
      const result = await noKeyClient.generateMealPlan(sampleProfile, 1);
      expect(result).toBeDefined();
      expect(result.meals || result.dailyMeals).toBeDefined();
    });

    it("falls back to mock when USE_MOCK_MEAL_PLANS=true", async () => {
      process.env.NODE_ENV = "development";
      process.env.USE_MOCK_MEAL_PLANS = "true";
      const result = await client.generateMealPlan(sampleProfile, 1);
      expect(result).toBeDefined();
      process.env.NODE_ENV = "test";
      process.env.USE_MOCK_MEAL_PLANS = "false";
    });

    it("generates a 3-day meal plan with correct structure", async () => {
      mockCreate.mockClear();
      const threeDayPlan = {
        dailyMeals: {
          day1: { breakfast: { ...validSingleDayPlan.meals.breakfast }, lunch: { ...validSingleDayPlan.meals.lunch }, snacks: { ...validSingleDayPlan.meals.snacks }, dinner: { ...validSingleDayPlan.meals.dinner } },
          day2: { breakfast: { ...validSingleDayPlan.meals.breakfast }, lunch: { ...validSingleDayPlan.meals.lunch }, snacks: { ...validSingleDayPlan.meals.snacks }, dinner: { ...validSingleDayPlan.meals.dinner } },
          day3: { breakfast: { ...validSingleDayPlan.meals.breakfast }, lunch: { ...validSingleDayPlan.meals.lunch }, snacks: { ...validSingleDayPlan.meals.snacks }, dinner: { ...validSingleDayPlan.meals.dinner } },
        },
        dailySummaries: {
          day1: { total_calories_kcal: 1190, total_protein_g: 85, total_carbs_g: 120, total_fat_g: 41 },
          day2: { total_calories_kcal: 1190, total_protein_g: 85, total_carbs_g: 120, total_fat_g: 41 },
          day3: { total_calories_kcal: 1190, total_protein_g: 85, total_carbs_g: 120, total_fat_g: 41 },
        },
        summary: { total_calories_kcal: 3570, total_protein_g: 255, total_carbs_g: 360, total_fat_g: 123 },
      };
      mockCreate.mockResolvedValueOnce(mockGroqResponse(threeDayPlan));
      const result = await client.generateMealPlan(sampleProfile, 3);
      expect(result.dailyMeals).toBeDefined();
      expect(Object.keys(result.dailyMeals).length).toBe(3);
      expect(result.dailySummaries.day3).toBeDefined();
    });

    // ── Integration with various patient profiles ────────────────
    describe("Integration with various patient profiles", () => {
      beforeEach(() => {
        mockCreate.mockResolvedValue(mockGroqResponse(validSingleDayPlan));
      });

      it("handles diabetic patient", async () => {
        const result = await client.generateMealPlan({ ...sampleProfile, diseaseCondition: "Type 2 Diabetes", healthGoal: "Weight Loss" });
        expect(result).toBeDefined();
      });

      it("handles hypertensive patient", async () => {
        const result = await client.generateMealPlan({ ...sampleProfile, diseaseCondition: "Hypertension (High Blood Pressure)", bloodPressure: "140/90" });
        expect(result).toBeDefined();
      });

      it("handles patient with multiple allergies", async () => {
        const result = await client.generateMealPlan({ ...sampleProfile, allergies: ["nuts", "dairy", "gluten", "shellfish"] });
        expect(result).toBeDefined();
      });

      it("handles very active patient", async () => {
        const result = await client.generateMealPlan({ ...sampleProfile, activityLevel: "Very Active", healthGoal: "Muscle Gain", weight_kg: 80 });
        expect(result).toBeDefined();
      });
    });
  });
});