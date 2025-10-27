const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const PatientProfile = require('../models/PatientProfile');
const MealPlan = require('../models/MealPlan');
const GeminiClient = require('../utils/geminiClient');
const { generateToken } = require('../utils/auth');

// Mock the GeminiClient
jest.mock('../utils/geminiClient');

describe('Meal Plan API Endpoints', () => {
  let patientUser, doctorUser, patientProfile;
  let patientToken, doctorToken;
  let mockGeminiClient;

  const mockMealPlanData = {
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

  beforeEach(async () => {
    // Clear database
    await User.deleteMany({});
    await PatientProfile.deleteMany({});
    await MealPlan.deleteMany({});

    // Create test users
    patientUser = await User.create({
      name: 'Test Patient',
      email: 'patient@test.com',
      password: 'hashedpassword123',
      role: 'patient'
    });

    doctorUser = await User.create({
      name: 'Test Doctor',
      email: 'doctor@test.com',
      password: 'hashedpassword123',
      role: 'doctor'
    });

    // Create patient profile
    patientProfile = await PatientProfile.create({
      user: patientUser._id,
      age: 30,
      height_cm: 170,
      weight_kg: 70,
      diseaseCondition: 'Diabetes Type 2',
      mealPreference: 'Vegetarian',
      activityLevel: 'Moderately Active',
      healthGoal: 'Weight Maintenance'
    });

    // Generate tokens
    patientToken = generateToken({ id: patientUser._id, role: patientUser.role });
    doctorToken = generateToken({ id: doctorUser._id, role: doctorUser.role });

    // Mock GeminiClient
    mockGeminiClient = {
      generateMealPlan: jest.fn().mockResolvedValue(mockMealPlanData)
    };
    GeminiClient.mockImplementation(() => mockGeminiClient);
  });

  describe('POST /api/mealplan/generate', () => {
    it('should generate meal plan for authenticated patient', async () => {
      const response = await request(app)
        .post('/api/mealplan/generate')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Meal plan generated successfully');
      expect(response.body.data.mealPlan).toBeDefined();
      expect(response.body.data.mealPlan.meals).toEqual(mockMealPlanData.meals);
      expect(response.body.data.mealPlan.summary).toEqual(mockMealPlanData.summary);

      // Verify meal plan was saved to database
      const savedMealPlan = await MealPlan.findOne({ patient: patientProfile._id });
      expect(savedMealPlan).toBeTruthy();
      expect(mockGeminiClient.generateMealPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          age: 30,
          diseaseCondition: 'Diabetes Type 2'
        })
      );
    });

    it('should return 404 if patient profile not found', async () => {
      // Create user without profile
      const userWithoutProfile = await User.create({
        name: 'No Profile User',
        email: 'noprofile@test.com',
        password: 'hashedpassword123',
        role: 'patient'
      });
      const tokenWithoutProfile = generateToken({ id: userWithoutProfile._id, role: userWithoutProfile.role });

      const response = await request(app)
        .post('/api/mealplan/generate')
        .set('Authorization', `Bearer ${tokenWithoutProfile}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Patient profile not found. Please create your profile first.');
      expect(response.body.code).toBe('PROFILE_NOT_FOUND');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .post('/api/mealplan/generate')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for doctor trying to use patient endpoint', async () => {
      const response = await request(app)
        .post('/api/mealplan/generate')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should handle Gemini API errors gracefully', async () => {
      mockGeminiClient.generateMealPlan.mockRejectedValue(new Error('Failed to generate meal plan: API error'));

      const response = await request(app)
        .post('/api/mealplan/generate')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unable to generate meal plan at this time. Please try again later.');
      expect(response.body.code).toBe('GEMINI_API_ERROR');
    });
  });

  describe('POST /api/mealplan/generate/:patientId', () => {
    it('should allow doctor to generate meal plan for patient', async () => {
      const response = await request(app)
        .post(`/api/mealplan/generate/${patientProfile._id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Test Patient');
      expect(response.body.data.mealPlan.patient.name).toBe('Test Patient');
      expect(response.body.data.mealPlan.patient.email).toBe('patient@test.com');

      // Verify meal plan was saved
      const savedMealPlan = await MealPlan.findOne({ patient: patientProfile._id });
      expect(savedMealPlan).toBeTruthy();
    });

    it('should return 403 for patient trying to use doctor endpoint', async () => {
      const response = await request(app)
        .post(`/api/mealplan/generate/${patientProfile._id}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should return 404 for non-existent patient profile', async () => {
      const fakePatientId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .post(`/api/mealplan/generate/${fakePatientId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('PROFILE_NOT_FOUND');
    });
  });

  describe('GET /api/mealplan/me', () => {
    beforeEach(async () => {
      // Create a meal plan for the patient
      await MealPlan.create({
        patient: patientProfile._id,
        meals: mockMealPlanData.meals,
        summary: mockMealPlanData.summary
      });
    });

    it('should retrieve patient\'s most recent meal plan', async () => {
      const response = await request(app)
        .get('/api/mealplan/me')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Meal plan retrieved successfully');
      expect(response.body.data.mealPlan.meals).toEqual(mockMealPlanData.meals);
      expect(response.body.data.mealPlan.summary).toEqual(mockMealPlanData.summary);
      expect(response.body.data.mealPlan.daysAgo).toBeDefined();
    });

    it('should return 404 if no meal plan exists', async () => {
      // Clear meal plans
      await MealPlan.deleteMany({});

      const response = await request(app)
        .get('/api/mealplan/me')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No meal plan found. Generate your first meal plan to get started.');
      expect(response.body.code).toBe('MEAL_PLAN_NOT_FOUND');
    });

    it('should return 404 if patient profile not found', async () => {
      const userWithoutProfile = await User.create({
        name: 'No Profile User',
        email: 'noprofile2@test.com',
        password: 'hashedpassword123',
        role: 'patient'
      });
      const tokenWithoutProfile = generateToken({ id: userWithoutProfile._id, role: userWithoutProfile.role });

      const response = await request(app)
        .get('/api/mealplan/me')
        .set('Authorization', `Bearer ${tokenWithoutProfile}`)
        .expect(404);

      expect(response.body.code).toBe('PROFILE_NOT_FOUND');
    });

    it('should return 403 for doctor trying to use patient endpoint', async () => {
      const response = await request(app)
        .get('/api/mealplan/me')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/mealplan/:patientId', () => {
    beforeEach(async () => {
      // Create a meal plan for the patient
      await MealPlan.create({
        patient: patientProfile._id,
        meals: mockMealPlanData.meals,
        summary: mockMealPlanData.summary
      });
    });

    it('should allow doctor to retrieve patient meal plan', async () => {
      const response = await request(app)
        .get(`/api/mealplan/${patientProfile._id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Test Patient');
      expect(response.body.data.mealPlan.patient.name).toBe('Test Patient');
      expect(response.body.data.mealPlan.meals).toEqual(mockMealPlanData.meals);
    });

    it('should return 403 for patient trying to access doctor endpoint', async () => {
      const response = await request(app)
        .get(`/api/mealplan/${patientProfile._id}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);

      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should return 404 for non-existent patient profile', async () => {
      const fakePatientId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/mealplan/${fakePatientId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(404);

      expect(response.body.code).toBe('PROFILE_NOT_FOUND');
    });

    it('should return 404 if patient has no meal plan', async () => {
      // Clear meal plans
      await MealPlan.deleteMany({});

      const response = await request(app)
        .get(`/api/mealplan/${patientProfile._id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No meal plan found for patient Test Patient');
      expect(response.body.code).toBe('MEAL_PLAN_NOT_FOUND');
      expect(response.body.data.patient.name).toBe('Test Patient');
    });
  });

  describe('GET /api/mealplan/:patientId/history', () => {
    beforeEach(async () => {
      // Create multiple meal plans for the patient
      const mealPlan1 = new MealPlan({
        patient: patientProfile._id,
        dayCount: 1,
        meals: mockMealPlanData.meals,
        summary: mockMealPlanData.summary,
        generatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      });
      
      const mealPlan2 = new MealPlan({
        patient: patientProfile._id,
        dayCount: 1,
        meals: mockMealPlanData.meals,
        summary: mockMealPlanData.summary,
        generatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      });
      
      const mealPlan3 = new MealPlan({
        patient: patientProfile._id,
        dayCount: 1,
        meals: mockMealPlanData.meals,
        summary: mockMealPlanData.summary,
        generatedAt: new Date() // today
      });

      await mealPlan1.save();
      await mealPlan2.save();
      await mealPlan3.save();
    });

    it('should retrieve meal plan history for doctor', async () => {
      const response = await request(app)
        .get(`/api/mealplan/${patientProfile._id}/history`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.mealPlans).toHaveLength(3);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.totalCount).toBe(3);
      expect(response.body.data.patient).toBeDefined();
      expect(response.body.data.patient.name).toBe(patientUser.name);
      
      // Check that meal plans are sorted by generatedAt in descending order
      const mealPlans = response.body.data.mealPlans;
      expect(new Date(mealPlans[0].generatedAt).getTime()).toBeGreaterThan(
        new Date(mealPlans[1].generatedAt).getTime()
      );
    });

    it('should support pagination for meal plan history', async () => {
      const response = await request(app)
        .get(`/api/mealplan/${patientProfile._id}/history?page=1&limit=2`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.mealPlans).toHaveLength(2);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalPages).toBe(2);
      expect(response.body.data.pagination.hasNextPage).toBe(true);
    });

    it('should reject patient access to meal plan history', async () => {
      const response = await request(app)
        .get(`/api/mealplan/${patientProfile._id}/history`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should return 404 for non-existent patient', async () => {
      const fakePatientId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/mealplan/${fakePatientId}/history`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('PROFILE_NOT_FOUND');
    });

    it('should return empty history for patient with no meal plans', async () => {
      // Create a new patient with no meal plans
      const newPatientUser = new User({
        name: 'New Patient',
        email: 'newpatient@test.com',
        password: 'hashedpassword',
        role: 'patient'
      });
      await newPatientUser.save();

      const newPatientProfile = new PatientProfile({
        user: newPatientUser._id,
        age: 25,
        height_cm: 170,
        weight_kg: 65,
        diseaseCondition: 'None',
        mealPreference: 'Vegetarian',
        activityLevel: 'Moderately Active',
        healthGoal: 'Weight Maintenance'
      });
      await newPatientProfile.save();

      const response = await request(app)
        .get(`/api/mealplan/${newPatientProfile._id}/history`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.mealPlans).toHaveLength(0);
      expect(response.body.data.pagination.totalCount).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should handle database connection errors', async () => {
      // Mock database error
      jest.spyOn(PatientProfile, 'findOne').mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/mealplan/generate')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INTERNAL_ERROR');
    });

    it('should handle invalid patient ID format', async () => {
      const response = await request(app)
        .get('/api/mealplan/invalid-id')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});