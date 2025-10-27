const User = require('../../models/User');
const PatientProfile = require('../../models/PatientProfile');
const MealPlan = require('../../models/MealPlan');

describe('MealPlan Model', () => {
  let testUser;
  let testPatientProfile;

  beforeEach(async () => {
    await MealPlan.deleteMany({});
    await PatientProfile.deleteMany({});
    await User.deleteMany({});

    // Create test user and patient profile
    testUser = new User({
      name: 'Test Patient',
      email: 'patient@example.com',
      password: 'password123',
      role: 'patient'
    });
    await testUser.save();

    testPatientProfile = new PatientProfile({
      user: testUser._id,
      age: 30,
      height_cm: 175,
      weight_kg: 70,
      diseaseCondition: 'Diabetes',
      mealPreference: 'Vegetarian',
      activityLevel: 'Moderately Active',
      healthGoal: 'Weight Maintenance'
    });
    await testPatientProfile.save();
  });

  describe('MealPlan Creation', () => {
    test('should create a valid meal plan with all required fields', async () => {
      const mealPlanData = {
        patient: testPatientProfile._id,
        dayCount: 1,
        meals: {
          breakfast: {
            items: 'Oatmeal with fruits',
            carbs_g: 45,
            protein_g: 8,
            fat_g: 3,
            fiber_g: 6,
            calories_kcal: 250
          },
          lunch: {
            items: 'Grilled chicken salad',
            carbs_g: 20,
            protein_g: 35,
            fat_g: 12,
            fiber_g: 8,
            calories_kcal: 320
          },
          snacks: {
            items: 'Greek yogurt with nuts',
            carbs_g: 15,
            protein_g: 12,
            fat_g: 8,
            fiber_g: 2,
            calories_kcal: 180
          },
          dinner: {
            items: 'Baked salmon with vegetables',
            carbs_g: 25,
            protein_g: 40,
            fat_g: 15,
            fiber_g: 10,
            calories_kcal: 380
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
      expect(savedMealPlan.patient.toString()).toBe(testPatientProfile._id.toString());
      expect(savedMealPlan.meals.breakfast.items).toBe(mealPlanData.meals.breakfast.items);
      expect(savedMealPlan.summary.total_calories_kcal).toBe(mealPlanData.summary.total_calories_kcal);
    });

    test('should fail to create meal plan without required fields', async () => {
      const mealPlan = new MealPlan({});
      await expect(mealPlan.save()).rejects.toThrow();
    });

    test('should fail to create meal plan without patient reference', async () => {
      const mealPlanData = {
        dayCount: 1,
        meals: {
          breakfast: {
            items: 'Oatmeal',
            carbs_g: 45,
            protein_g: 8,
            fat_g: 3,
            fiber_g: 6,
            calories_kcal: 250
          },
          lunch: {
            items: 'Salad',
            carbs_g: 20,
            protein_g: 35,
            fat_g: 12,
            fiber_g: 8,
            calories_kcal: 320
          },
          snacks: {
            items: 'Yogurt',
            carbs_g: 15,
            protein_g: 12,
            fat_g: 8,
            fiber_g: 2,
            calories_kcal: 180
          },
          dinner: {
            items: 'Salmon',
            carbs_g: 25,
            protein_g: 40,
            fat_g: 15,
            fiber_g: 10,
            calories_kcal: 380
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
      await expect(mealPlan.save()).rejects.toThrow();
    });

    test('should validate negative nutritional values', async () => {
      const mealPlanData = {
        patient: testPatientProfile._id,
        dayCount: 1,
        meals: {
          breakfast: {
            items: 'Oatmeal',
            carbs_g: -5, // Invalid negative value
            protein_g: 8,
            fat_g: 3,
            fiber_g: 6,
            calories_kcal: 250
          },
          lunch: {
            items: 'Salad',
            carbs_g: 20,
            protein_g: 35,
            fat_g: 12,
            fiber_g: 8,
            calories_kcal: 320
          },
          snacks: {
            items: 'Yogurt',
            carbs_g: 15,
            protein_g: 12,
            fat_g: 8,
            fiber_g: 2,
            calories_kcal: 180
          },
          dinner: {
            items: 'Salmon',
            carbs_g: 25,
            protein_g: 40,
            fat_g: 15,
            fiber_g: 10,
            calories_kcal: 380
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
      await expect(mealPlan.save()).rejects.toThrow();
    });
  });

  describe('Static Methods', () => {
    test('should get latest meal plan for patient', async () => {
      // Create multiple meal plans
      const mealPlanData = {
        patient: testPatientProfile._id,
        dayCount: 1,
        meals: {
          breakfast: { items: 'Oatmeal', carbs_g: 45, protein_g: 8, fat_g: 3, fiber_g: 6, calories_kcal: 250 },
          lunch: { items: 'Salad', carbs_g: 20, protein_g: 35, fat_g: 12, fiber_g: 8, calories_kcal: 320 },
          snacks: { items: 'Yogurt', carbs_g: 15, protein_g: 12, fat_g: 8, fiber_g: 2, calories_kcal: 180 },
          dinner: { items: 'Salmon', carbs_g: 25, protein_g: 40, fat_g: 15, fiber_g: 10, calories_kcal: 380 }
        },
        summary: { total_calories_kcal: 1130, total_protein_g: 95, total_carbs_g: 105, total_fat_g: 38 }
      };

      const mealPlan1 = new MealPlan({ ...mealPlanData, generatedAt: new Date('2023-01-01') });
      await mealPlan1.save();

      const mealPlan2 = new MealPlan({ ...mealPlanData, generatedAt: new Date('2023-01-02') });
      await mealPlan2.save();

      const latestMealPlan = await MealPlan.getLatestForPatient(testPatientProfile._id);
      expect(latestMealPlan._id.toString()).toBe(mealPlan2._id.toString());
    });
  });

  describe('Instance Methods', () => {
    test('should validate summary totals correctly', async () => {
      const mealPlanData = {
        patient: testPatientProfile._id,
        dayCount: 1,
        meals: {
          breakfast: { items: 'Oatmeal', carbs_g: 45, protein_g: 8, fat_g: 3, fiber_g: 6, calories_kcal: 250 },
          lunch: { items: 'Salad', carbs_g: 20, protein_g: 35, fat_g: 12, fiber_g: 8, calories_kcal: 320 },
          snacks: { items: 'Yogurt', carbs_g: 15, protein_g: 12, fat_g: 8, fiber_g: 2, calories_kcal: 180 },
          dinner: { items: 'Salmon', carbs_g: 25, protein_g: 40, fat_g: 15, fiber_g: 10, calories_kcal: 380 }
        },
        summary: { total_calories_kcal: 1130, total_protein_g: 95, total_carbs_g: 105, total_fat_g: 38 }
      };

      const mealPlan = new MealPlan(mealPlanData);
      await mealPlan.save();

      const validation = mealPlan.validateSummary();
      expect(validation.isValid).toBe(true);
      expect(validation.calculatedTotals.total_calories_kcal).toBe(1130);
    });
  });
});