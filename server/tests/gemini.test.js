const GeminiClient = require('../utils/geminiClient');
const PatientProfile = require('../models/PatientProfile');
const User = require('../models/User');

// Mock the Gemini API
jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn()
      })
    }))
  };
});

describe('GeminiClient', () => {
  let geminiClient;
  let mockModel;
  let samplePatientProfile;

  beforeAll(() => {
    // Set up environment variable for testing
    process.env.GEMINI_API_KEY = 'test-api-key';
  });

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create GeminiClient instance
    geminiClient = new GeminiClient();
    mockModel = geminiClient.model;

    // Sample patient profile for testing
    samplePatientProfile = {
      age: 30,
      height_cm: 170,
      weight_kg: 70,
      bloodPressure: '120/80',
      bloodGroup: 'O+',
      medicalSummary: 'Generally healthy',
      diseaseCondition: 'Diabetes Type 2',
      mealPreference: 'Vegetarian',
      allergies: ['nuts', 'shellfish'],
      dislikedItems: ['broccoli', 'spinach'],
      activityLevel: 'Moderately Active',
      healthGoal: 'Weight Maintenance'
    };
  });

  afterAll(() => {
    delete process.env.GEMINI_API_KEY;
  });

  describe('Constructor', () => {
    it('should throw error if GEMINI_API_KEY is not provided', () => {
      delete process.env.GEMINI_API_KEY;
      expect(() => new GeminiClient()).toThrow('GEMINI_API_KEY environment variable is required');
      process.env.GEMINI_API_KEY = 'test-api-key'; // Restore for other tests
    });

    it('should initialize successfully with API key', () => {
      expect(() => new GeminiClient()).not.toThrow();
    });
  });

  describe('constructPrompt', () => {
    it('should construct a detailed prompt with all patient profile data', () => {
      const prompt = geminiClient.constructPrompt(samplePatientProfile);
      
      expect(prompt).toContain('Age: 30 years');
      expect(prompt).toContain('Height: 170 cm');
      expect(prompt).toContain('Weight: 70 kg');
      expect(prompt).toContain('Blood Pressure: 120/80');
      expect(prompt).toContain('Blood Group: O+');
      expect(prompt).toContain('Disease/Condition: Diabetes Type 2');
      expect(prompt).toContain('Meal Preference: Vegetarian');
      expect(prompt).toContain('Allergies: nuts, shellfish');
      expect(prompt).toContain('Disliked Items: broccoli, spinach');
      expect(prompt).toContain('Activity Level: Moderately Active');
      expect(prompt).toContain('Health Goal: Weight Maintenance');
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalProfile = {
        age: 25,
        height_cm: 165,
        weight_kg: 60,
        diseaseCondition: 'None',
        mealPreference: 'Non-Vegetarian',
        activityLevel: 'Lightly Active',
        healthGoal: 'Weight Loss'
      };

      const prompt = geminiClient.constructPrompt(minimalProfile);
      
      expect(prompt).toContain('Blood Pressure: Not specified');
      expect(prompt).toContain('Blood Group: Not specified');
      expect(prompt).toContain('Medical Summary: None provided');
      expect(prompt).toContain('Allergies: None');
      expect(prompt).toContain('Disliked Items: None');
    });

    it('should include JSON format requirements in prompt', () => {
      const prompt = geminiClient.constructPrompt(samplePatientProfile);
      
      expect(prompt).toContain('ONLY a valid JSON object');
      expect(prompt).toContain('"breakfast"');
      expect(prompt).toContain('"lunch"');
      expect(prompt).toContain('"snacks"');
      expect(prompt).toContain('"dinner"');
      expect(prompt).toContain('"summary"');
    });
  });

  describe('parseAndValidateResponse', () => {
    const validMealPlanResponse = {
      meals: {
        breakfast: {
          items: "Oatmeal with berries and nuts",
          carbs_g: 45,
          protein_g: 8,
          fat_g: 6,
          fiber_g: 7,
          calories_kcal: 280
        },
        lunch: {
          items: "Grilled chicken salad with quinoa",
          carbs_g: 35,
          protein_g: 30,
          fat_g: 12,
          fiber_g: 8,
          calories_kcal: 350
        },
        snacks: {
          items: "Greek yogurt with almonds",
          carbs_g: 15,
          protein_g: 12,
          fat_g: 8,
          fiber_g: 2,
          calories_kcal: 180
        },
        dinner: {
          items: "Baked salmon with roasted vegetables",
          carbs_g: 25,
          protein_g: 35,
          fat_g: 15,
          fiber_g: 6,
          calories_kcal: 380
        }
      },
      summary: {
        total_calories_kcal: 1190,
        total_protein_g: 85,
        total_carbs_g: 120,
        total_fat_g: 41
      }
    };

    it('should parse valid JSON response correctly', () => {
      const responseText = JSON.stringify(validMealPlanResponse);
      const result = geminiClient.parseAndValidateResponse(responseText);
      
      expect(result).toEqual(validMealPlanResponse);
    });

    it('should handle response with markdown code blocks', () => {
      const responseText = `\`\`\`json\n${JSON.stringify(validMealPlanResponse)}\n\`\`\``;
      const result = geminiClient.parseAndValidateResponse(responseText);
      
      expect(result).toEqual(validMealPlanResponse);
    });

    it('should extract JSON from mixed content response', () => {
      const responseText = `Here's your meal plan:\n${JSON.stringify(validMealPlanResponse)}\nEnjoy your meals!`;
      const result = geminiClient.parseAndValidateResponse(responseText);
      
      expect(result).toEqual(validMealPlanResponse);
    });

    it('should throw error for invalid JSON', () => {
      const invalidResponse = 'This is not JSON';
      
      expect(() => {
        geminiClient.parseAndValidateResponse(invalidResponse);
      }).toThrow('No valid JSON found in response');
    });

    it('should throw error for missing required meal', () => {
      const invalidMealPlan = {
        meals: {
          breakfast: validMealPlanResponse.meals.breakfast,
          lunch: validMealPlanResponse.meals.lunch,
          // Missing snacks and dinner
        },
        summary: validMealPlanResponse.summary
      };
      
      const responseText = JSON.stringify(invalidMealPlan);
      
      expect(() => {
        geminiClient.parseAndValidateResponse(responseText);
      }).toThrow('Missing required meal: snacks');
    });

    it('should throw error for missing nutritional fields', () => {
      const invalidMealPlan = {
        meals: {
          breakfast: {
            items: "Oatmeal",
            carbs_g: 45,
            protein_g: 8,
            // Missing fat_g, fiber_g, calories_kcal
          },
          lunch: validMealPlanResponse.meals.lunch,
          snacks: validMealPlanResponse.meals.snacks,
          dinner: validMealPlanResponse.meals.dinner
        },
        summary: validMealPlanResponse.summary
      };
      
      const responseText = JSON.stringify(invalidMealPlan);
      
      expect(() => {
        geminiClient.parseAndValidateResponse(responseText);
      }).toThrow('Missing required field fat_g in breakfast');
    });

    it('should throw error for negative nutritional values', () => {
      const invalidMealPlan = {
        meals: {
          breakfast: {
            ...validMealPlanResponse.meals.breakfast,
            calories_kcal: -100
          },
          lunch: validMealPlanResponse.meals.lunch,
          snacks: validMealPlanResponse.meals.snacks,
          dinner: validMealPlanResponse.meals.dinner
        },
        summary: validMealPlanResponse.summary
      };
      
      const responseText = JSON.stringify(invalidMealPlan);
      
      expect(() => {
        geminiClient.parseAndValidateResponse(responseText);
      }).toThrow('Invalid calories_kcal value in breakfast: must be a non-negative number');
    });
  });

  describe('generateMealPlan', () => {
    it('should generate meal plan successfully with valid response', async () => {
      const validResponse = {
        meals: {
          breakfast: {
            items: "Vegetarian oatmeal with fruits",
            carbs_g: 50,
            protein_g: 10,
            fat_g: 5,
            fiber_g: 8,
            calories_kcal: 300
          },
          lunch: {
            items: "Quinoa salad with vegetables",
            carbs_g: 40,
            protein_g: 15,
            fat_g: 8,
            fiber_g: 6,
            calories_kcal: 280
          },
          snacks: {
            items: "Mixed nuts and fruits",
            carbs_g: 20,
            protein_g: 8,
            fat_g: 12,
            fiber_g: 4,
            calories_kcal: 200
          },
          dinner: {
            items: "Lentil curry with brown rice",
            carbs_g: 45,
            protein_g: 18,
            fat_g: 6,
            fiber_g: 10,
            calories_kcal: 320
          }
        },
        summary: {
          total_calories_kcal: 1100,
          total_protein_g: 51,
          total_carbs_g: 155,
          total_fat_g: 31
        }
      };

      // Mock successful API response
      mockModel.generateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(validResponse)
        }
      });

      const result = await geminiClient.generateMealPlan(samplePatientProfile);
      
      expect(result).toEqual(validResponse);
      expect(mockModel.generateContent).toHaveBeenCalledTimes(1);
      
      // Verify the prompt contains patient data
      const calledPrompt = mockModel.generateContent.mock.calls[0][0];
      expect(calledPrompt).toContain('Diabetes Type 2');
      expect(calledPrompt).toContain('Vegetarian');
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      mockModel.generateContent.mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(geminiClient.generateMealPlan(samplePatientProfile))
        .rejects.toThrow('Failed to generate meal plan: API rate limit exceeded');
    });

    it('should handle invalid API response format', async () => {
      // Mock invalid response
      mockModel.generateContent.mockResolvedValue({
        response: {
          text: () => 'Invalid response format'
        }
      });

      await expect(geminiClient.generateMealPlan(samplePatientProfile))
        .rejects.toThrow('Failed to generate meal plan');
    });

    it('should handle network timeout errors', async () => {
      // Mock network timeout
      mockModel.generateContent.mockRejectedValue(new Error('Request timeout'));

      await expect(geminiClient.generateMealPlan(samplePatientProfile))
        .rejects.toThrow('Failed to generate meal plan: Request timeout');
    });
  });

  describe('Integration with different patient profiles', () => {
    beforeEach(() => {
      // Mock successful response for integration tests
      const mockResponse = {
        meals: {
          breakfast: { items: "Test breakfast", carbs_g: 30, protein_g: 10, fat_g: 5, fiber_g: 5, calories_kcal: 200 },
          lunch: { items: "Test lunch", carbs_g: 40, protein_g: 20, fat_g: 10, fiber_g: 6, calories_kcal: 320 },
          snacks: { items: "Test snacks", carbs_g: 15, protein_g: 5, fat_g: 8, fiber_g: 3, calories_kcal: 150 },
          dinner: { items: "Test dinner", carbs_g: 35, protein_g: 25, fat_g: 12, fiber_g: 7, calories_kcal: 330 }
        },
        summary: { total_calories_kcal: 1000, total_protein_g: 60, total_carbs_g: 120, total_fat_g: 35 }
      };

      mockModel.generateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(mockResponse) }
      });
    });

    it('should handle diabetic patient profile', async () => {
      const diabeticProfile = {
        ...samplePatientProfile,
        diseaseCondition: 'Diabetes Type 2',
        healthGoal: 'Weight Loss'
      };

      const result = await geminiClient.generateMealPlan(diabeticProfile);
      expect(result).toBeDefined();
      expect(result.meals).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should handle hypertensive patient profile', async () => {
      const hypertensiveProfile = {
        ...samplePatientProfile,
        diseaseCondition: 'Hypertension',
        bloodPressure: '140/90',
        healthGoal: 'Manage Condition'
      };

      const result = await geminiClient.generateMealPlan(hypertensiveProfile);
      expect(result).toBeDefined();
    });

    it('should handle patient with multiple allergies', async () => {
      const allergyProfile = {
        ...samplePatientProfile,
        allergies: ['nuts', 'dairy', 'gluten', 'shellfish'],
        dislikedItems: ['mushrooms', 'olives', 'anchovies']
      };

      const result = await geminiClient.generateMealPlan(allergyProfile);
      expect(result).toBeDefined();
    });

    it('should handle very active patient profile', async () => {
      const activeProfile = {
        ...samplePatientProfile,
        activityLevel: 'Very Active',
        healthGoal: 'Muscle Gain',
        weight_kg: 80
      };

      const result = await geminiClient.generateMealPlan(activeProfile);
      expect(result).toBeDefined();
    });
  });
});