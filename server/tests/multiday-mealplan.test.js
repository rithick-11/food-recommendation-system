const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const PatientProfile = require('../models/PatientProfile');
const MealPlan = require('../models/MealPlan');
const { generateToken } = require('../utils/auth');

describe('Multi-Day Meal Plan API', () => {
  let patientUser, patientProfile, patientToken;

  beforeEach(async () => {
    // Clear database
    await User.deleteMany({});
    await PatientProfile.deleteMany({});
    await MealPlan.deleteMany({});

    // Create test patient
    patientUser = await User.create({
      name: 'Test Patient',
      email: 'patient@test.com',
      password: 'hashedpassword123',
      role: 'patient'
    });

    patientProfile = await PatientProfile.create({
      user: patientUser._id,
      age: 30,
      height_cm: 175,
      weight_kg: 70,
      diseaseCondition: 'Diabetes',
      mealPreference: 'Vegetarian',
      activityLevel: 'Moderately Active',
      healthGoal: 'Weight Maintenance'
    });

    patientToken = generateToken({ id: patientUser._id, role: patientUser.role });
  });

  describe('Multi-Day Meal Plan Generation', () => {
    it('should accept dayCount parameter for meal plan generation', async () => {
      const response = await request(app)
        .post('/api/mealplan/generate')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ dayCount: 3 });

      // Should not return validation error for dayCount
      expect(response.status).not.toBe(400);
      
      // If it's a 500, it's likely due to Gemini API issues, not dayCount validation
      if (response.status === 500) {
        expect(response.body.message).not.toContain('Day count');
      }
    });

    it('should reject invalid dayCount values', async () => {
      const response = await request(app)
        .post('/api/mealplan/generate')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ dayCount: 8 }); // Invalid: > 7

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Day count must be an integer between 1 and 7');
    });

    it('should reject negative dayCount values', async () => {
      const response = await request(app)
        .post('/api/mealplan/generate')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ dayCount: -1 }); // Invalid: < 1

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Day count must be an integer between 1 and 7');
    });

    it('should default to 1 day when dayCount is not provided', async () => {
      const response = await request(app)
        .post('/api/mealplan/generate')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({}); // No dayCount provided

      // Should not return validation error
      expect(response.status).not.toBe(400);
    });
  });

  describe('Multi-Day MealPlan Model', () => {
    it('should create a valid single-day meal plan', async () => {
      const mealPlanData = {
        patient: patientProfile._id,
        dayCount: 1,
        meals: {
          breakfast: {
            items: 'Oatmeal with fruits',
            carbs_g: 45, protein_g: 8, fat_g: 3, fiber_g: 6, calories_kcal: 250
          },
          lunch: {
            items: 'Grilled chicken salad',
            carbs_g: 20, protein_g: 35, fat_g: 12, fiber_g: 8, calories_kcal: 320
          },
          snacks: {
            items: 'Greek yogurt with nuts',
            carbs_g: 15, protein_g: 12, fat_g: 8, fiber_g: 2, calories_kcal: 180
          },
          dinner: {
            items: 'Baked salmon with vegetables',
            carbs_g: 25, protein_g: 40, fat_g: 15, fiber_g: 10, calories_kcal: 380
          }
        },
        summary: {
          total_calories_kcal: 1130,
          total_protein_g: 95,
          total_carbs_g: 105,
          total_fat_g: 38
        }
      };

      const mealPlan = new MealPlan(mealPlanData);
      const savedMealPlan = await mealPlan.save();

      expect(savedMealPlan._id).toBeDefined();
      expect(savedMealPlan.dayCount).toBe(1);
      expect(savedMealPlan.meals).toBeDefined();
      expect(savedMealPlan.dailyMeals).toBeUndefined();
    });

    it('should create a valid multi-day meal plan', async () => {
      const mealPlanData = {
        patient: patientProfile._id,
        dayCount: 3,
        dailyMeals: {
          day1: {
            breakfast: { items: 'Day 1 Breakfast', carbs_g: 45, protein_g: 8, fat_g: 3, fiber_g: 6, calories_kcal: 250 },
            lunch: { items: 'Day 1 Lunch', carbs_g: 20, protein_g: 35, fat_g: 12, fiber_g: 8, calories_kcal: 320 },
            snacks: { items: 'Day 1 Snacks', carbs_g: 15, protein_g: 12, fat_g: 8, fiber_g: 2, calories_kcal: 180 },
            dinner: { items: 'Day 1 Dinner', carbs_g: 25, protein_g: 40, fat_g: 15, fiber_g: 10, calories_kcal: 380 }
          },
          day2: {
            breakfast: { items: 'Day 2 Breakfast', carbs_g: 45, protein_g: 8, fat_g: 3, fiber_g: 6, calories_kcal: 250 },
            lunch: { items: 'Day 2 Lunch', carbs_g: 20, protein_g: 35, fat_g: 12, fiber_g: 8, calories_kcal: 320 },
            snacks: { items: 'Day 2 Snacks', carbs_g: 15, protein_g: 12, fat_g: 8, fiber_g: 2, calories_kcal: 180 },
            dinner: { items: 'Day 2 Dinner', carbs_g: 25, protein_g: 40, fat_g: 15, fiber_g: 10, calories_kcal: 380 }
          },
          day3: {
            breakfast: { items: 'Day 3 Breakfast', carbs_g: 45, protein_g: 8, fat_g: 3, fiber_g: 6, calories_kcal: 250 },
            lunch: { items: 'Day 3 Lunch', carbs_g: 20, protein_g: 35, fat_g: 12, fiber_g: 8, calories_kcal: 320 },
            snacks: { items: 'Day 3 Snacks', carbs_g: 15, protein_g: 12, fat_g: 8, fiber_g: 2, calories_kcal: 180 },
            dinner: { items: 'Day 3 Dinner', carbs_g: 25, protein_g: 40, fat_g: 15, fiber_g: 10, calories_kcal: 380 }
          }
        },
        dailySummaries: {
          day1: { total_calories_kcal: 1130, total_protein_g: 95, total_carbs_g: 105, total_fat_g: 38 },
          day2: { total_calories_kcal: 1130, total_protein_g: 95, total_carbs_g: 105, total_fat_g: 38 },
          day3: { total_calories_kcal: 1130, total_protein_g: 95, total_carbs_g: 105, total_fat_g: 38 }
        },
        summary: {
          total_calories_kcal: 3390,
          total_protein_g: 285,
          total_carbs_g: 315,
          total_fat_g: 114
        }
      };

      const mealPlan = new MealPlan(mealPlanData);
      const savedMealPlan = await mealPlan.save();

      expect(savedMealPlan._id).toBeDefined();
      expect(savedMealPlan.dayCount).toBe(3);
      expect(savedMealPlan.meals).toBeUndefined();
      expect(savedMealPlan.dailyMeals).toBeDefined();
      expect(savedMealPlan.dailySummaries).toBeDefined();
    });

    it('should validate dayCount range', async () => {
      const mealPlanData = {
        patient: patientProfile._id,
        dayCount: 10, // Invalid: > 7
        meals: {
          breakfast: { items: 'Test', carbs_g: 45, protein_g: 8, fat_g: 3, fiber_g: 6, calories_kcal: 250 },
          lunch: { items: 'Test', carbs_g: 20, protein_g: 35, fat_g: 12, fiber_g: 8, calories_kcal: 320 },
          snacks: { items: 'Test', carbs_g: 15, protein_g: 12, fat_g: 8, fiber_g: 2, calories_kcal: 180 },
          dinner: { items: 'Test', carbs_g: 25, protein_g: 40, fat_g: 15, fiber_g: 10, calories_kcal: 380 }
        },
        summary: { total_calories_kcal: 1130, total_protein_g: 95, total_carbs_g: 105, total_fat_g: 38 }
      };

      const mealPlan = new MealPlan(mealPlanData);
      await expect(mealPlan.save()).rejects.toThrow();
    });
  });
});