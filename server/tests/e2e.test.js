const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const PatientProfile = require('../models/PatientProfile');
const MealPlan = require('../models/MealPlan');

describe('End-to-End Testing', () => {
  let patientToken, doctorToken, patientId, doctorId, patientProfileId;

  beforeEach(async () => {
    // Clean up database before each test
    await User.deleteMany({});
    await PatientProfile.deleteMany({});
    await MealPlan.deleteMany({});
  });

  describe('Complete Patient Workflow', () => {
    test('Patient registration, profile creation, and meal plan generation', async () => {
      // Step 1: Patient Registration
      const patientRegistration = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Patient',
          email: 'patient@test.com',
          password: 'password123',
          role: 'patient'
        });

      expect(patientRegistration.status).toBe(201);
      expect(patientRegistration.body.success).toBe(true);
      expect(patientRegistration.body.data.user.role).toBe('patient');
      
      patientId = patientRegistration.body.data.user.id;
      patientToken = patientRegistration.body.data.token;

      // Step 2: Patient Login (verify authentication works)
      const patientLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'patient@test.com',
          password: 'password123'
        });

      expect(patientLogin.status).toBe(200);
      expect(patientLogin.body.success).toBe(true);
      expect(patientLogin.body.data.token).toBeDefined();

      // Step 3: Create Patient Profile
      const profileData = {
        age: 30,
        height_cm: 175,
        weight_kg: 70,
        bloodPressure: '120/80',
        bloodGroup: 'O+',
        medicalSummary: 'Generally healthy',
        diseaseCondition: 'None',
        mealPreference: 'Vegetarian',
        allergies: ['nuts'],
        dislikedItems: ['broccoli'],
        activityLevel: 'Moderately Active',
        healthGoal: 'Weight Maintenance'
      };

      const profileCreation = await request(app)
        .post('/api/profile/me')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(profileData);

      expect(profileCreation.status).toBe(200);
      expect(profileCreation.body.success).toBe(true);
      expect(profileCreation.body.data.age).toBe(30);
      expect(profileCreation.body.data.mealPreference).toBe('Vegetarian');
      
      patientProfileId = profileCreation.body.data._id;

      // Step 4: Retrieve Patient Profile
      const profileRetrieval = await request(app)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(profileRetrieval.status).toBe(200);
      expect(profileRetrieval.body.success).toBe(true);
      expect(profileRetrieval.body.data.age).toBe(30);

      // Step 5: Generate Meal Plan (mock Gemini API response)
      // Note: This will fail without actual Gemini API key, but we test the endpoint structure
      const mealPlanGeneration = await request(app)
        .post('/api/mealplan/generate')
        .set('Authorization', `Bearer ${patientToken}`);

      // We expect this to fail due to missing/invalid Gemini API key in test environment
      // But we can verify the endpoint exists and handles authentication
      expect([400, 500, 503].includes(mealPlanGeneration.status)).toBe(true);
      
      // If it's a 400 or 503, it means authentication worked but API call failed (expected)
      if ([400, 503].includes(mealPlanGeneration.status)) {
        expect(mealPlanGeneration.body.success).toBe(false);
      }
    });

    test('Patient profile update workflow', async () => {
      // Register patient
      const registration = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Patient',
          email: 'jane@test.com',
          password: 'password123',
          role: 'patient'
        });

      const token = registration.body.data.token;

      // Create initial profile
      const initialProfile = await request(app)
        .post('/api/profile/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          age: 25,
          height_cm: 165,
          weight_kg: 60,
          diseaseCondition: 'None',
          mealPreference: 'Non-Vegetarian',
          activityLevel: 'Lightly Active',
          healthGoal: 'Weight Loss'
        });

      expect(initialProfile.status).toBe(200);

      // Update profile
      const updatedProfile = await request(app)
        .post('/api/profile/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          age: 26,
          height_cm: 165,
          weight_kg: 58,
          diseaseCondition: 'None',
          mealPreference: 'Vegetarian',
          activityLevel: 'Moderately Active',
          healthGoal: 'Weight Maintenance'
        });

      expect(updatedProfile.status).toBe(200);
      expect(updatedProfile.body.data.age).toBe(26);
      expect(updatedProfile.body.data.weight_kg).toBe(58);
      expect(updatedProfile.body.data.mealPreference).toBe('Vegetarian');
    });
  });

  describe('Complete Doctor Workflow', () => {
    let patientProfileId;
    
    beforeEach(async () => {
      // Create a patient for doctor to manage
      const patientReg = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Patient',
          email: 'testpatient@test.com',
          password: 'password123',
          role: 'patient'
        });

      patientId = patientReg.body.data.user.id;
      patientToken = patientReg.body.data.token;

      // Create patient profile
      const profileResponse = await request(app)
        .post('/api/profile/me')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          age: 35,
          height_cm: 180,
          weight_kg: 75,
          diseaseCondition: 'Diabetes',
          mealPreference: 'Mixed',
          activityLevel: 'Sedentary',
          healthGoal: 'Manage Condition'
        });
      
      patientProfileId = profileResponse.body.data._id;
    });

    test('Doctor registration, patient management, and meal plan oversight', async () => {
      // Step 1: Doctor Registration
      const doctorRegistration = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Dr. Smith',
          email: 'doctor@test.com',
          password: 'password123',
          role: 'doctor'
        });

      expect(doctorRegistration.status).toBe(201);
      expect(doctorRegistration.body.success).toBe(true);
      expect(doctorRegistration.body.data.user.role).toBe('doctor');
      
      doctorId = doctorRegistration.body.data.user.id;
      doctorToken = doctorRegistration.body.data.token;

      // Step 2: Doctor Login
      const doctorLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'doctor@test.com',
          password: 'password123'
        });

      expect(doctorLogin.status).toBe(200);
      expect(doctorLogin.body.success).toBe(true);

      // Step 3: View All Patients
      const patientsList = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(patientsList.status).toBe(200);
      expect(patientsList.body.success).toBe(true);
      expect(Array.isArray(patientsList.body.data)).toBe(true);
      expect(patientsList.body.data.length).toBeGreaterThan(0);

      // Step 4: View Specific Patient Profile
      const patientProfile = await request(app)
        .get(`/api/patients/profile/${patientId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(patientProfile.status).toBe(200);
      expect(patientProfile.body.success).toBe(true);
      expect(patientProfile.body.data.age).toBe(35);
      expect(patientProfile.body.data.diseaseCondition).toBe('Diabetes');

      // Step 5: Update Patient Profile
      const profileUpdate = await request(app)
        .put(`/api/patients/profile/${patientId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          age: 36,
          height_cm: 180,
          weight_kg: 73,
          bloodPressure: '130/85',
          medicalSummary: 'Type 2 diabetes, well controlled',
          diseaseCondition: 'Type 2 Diabetes',
          mealPreference: 'Mixed',
          activityLevel: 'Lightly Active',
          healthGoal: 'Manage Condition'
        });

      expect(profileUpdate.status).toBe(200);
      expect(profileUpdate.body.success).toBe(true);
      expect(profileUpdate.body.data.age).toBe(36);
      expect(profileUpdate.body.data.weight_kg).toBe(73);

      // Step 6: Generate Meal Plan for Patient (will fail without API key, but test endpoint)
      const mealPlanGeneration = await request(app)
        .post(`/api/mealplan/generate/${patientProfileId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      // Expect failure due to missing Gemini API key, but endpoint should be accessible
      expect([400, 500, 503].includes(mealPlanGeneration.status)).toBe(true);
    });

    test('Doctor access control verification', async () => {
      // Register doctor
      const doctorReg = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Dr. Access Test',
          email: 'docaccess@test.com',
          password: 'password123',
          role: 'doctor'
        });

      const doctorToken = doctorReg.body.data.token;

      // Verify doctor can access patient endpoints
      const patientsAccess = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(patientsAccess.status).toBe(200);

      // Verify patient cannot access doctor endpoints
      const patientAccessAttempt = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(patientAccessAttempt.status).toBe(403);
      expect(patientAccessAttempt.body.success).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('Authentication error handling', async () => {
      // Test without token
      const noTokenRequest = await request(app)
        .get('/api/profile/me');

      expect(noTokenRequest.status).toBe(401);
      expect(noTokenRequest.body.success).toBe(false);

      // Test with invalid token
      const invalidTokenRequest = await request(app)
        .get('/api/profile/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(invalidTokenRequest.status).toBe(401);
      expect(invalidTokenRequest.body.success).toBe(false);
    });

    test('Registration validation errors', async () => {
      // Test duplicate email
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'First User',
          email: 'duplicate@test.com',
          password: 'password123',
          role: 'patient'
        });

      const duplicateEmail = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Second User',
          email: 'duplicate@test.com',
          password: 'password123',
          role: 'patient'
        });

      expect(duplicateEmail.status).toBe(400);
      expect(duplicateEmail.body.success).toBe(false);

      // Test missing required fields
      const missingFields = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Incomplete User',
          email: 'incomplete@test.com'
          // Missing password and role
        });

      expect(missingFields.status).toBe(400);
      expect(missingFields.body.success).toBe(false);
    });

    test('Profile validation errors', async () => {
      // Register patient first
      const registration = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Profile Test',
          email: 'profiletest@test.com',
          password: 'password123',
          role: 'patient'
        });

      const token = registration.body.data.token;

      // Test missing required fields
      const incompleteProfile = await request(app)
        .post('/api/profile/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          age: 30,
          height_cm: 175
          // Missing required fields
        });

      expect(incompleteProfile.status).toBe(400);
      expect(incompleteProfile.body.success).toBe(false);

      // Test invalid enum values
      const invalidEnumProfile = await request(app)
        .post('/api/profile/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          age: 30,
          height_cm: 175,
          weight_kg: 70,
          diseaseCondition: 'None',
          mealPreference: 'InvalidPreference',
          activityLevel: 'Moderately Active',
          healthGoal: 'Weight Loss'
        });

      expect(invalidEnumProfile.status).toBe(400);
      expect(invalidEnumProfile.body.success).toBe(false);
    });

    test('Role-based access control', async () => {
      // Create patient and doctor
      const patientReg = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Patient User',
          email: 'patient.rbac@test.com',
          password: 'password123',
          role: 'patient'
        });

      const doctorReg = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Doctor User',
          email: 'doctor.rbac@test.com',
          password: 'password123',
          role: 'doctor'
        });

      const patientToken = patientReg.body.data.token;
      const doctorToken = doctorReg.body.data.token;
      const patientId = patientReg.body.data.user.id;

      // Patient should not access doctor endpoints
      const patientAccessDoctorEndpoint = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(patientAccessDoctorEndpoint.status).toBe(403);

      // Doctor should not access patient-specific endpoints for other patients
      const doctorAccessPatientProfile = await request(app)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(doctorAccessPatientProfile.status).toBe(403);
    });
  });

  describe('API Health and Status', () => {
    test('Server health check', async () => {
      const healthCheck = await request(app)
        .get('/api/health');

      expect(healthCheck.status).toBe(200);
      expect(healthCheck.body.status).toBe('OK');
      expect(healthCheck.body.timestamp).toBeDefined();
    });

    test('Root endpoint', async () => {
      const rootEndpoint = await request(app)
        .get('/');

      expect(rootEndpoint.status).toBe(200);
      expect(rootEndpoint.body.message).toBe('Food Recommendation System API');
      expect(rootEndpoint.body.status).toBe('Server is running successfully');
    });

    test('404 handling', async () => {
      const notFoundEndpoint = await request(app)
        .get('/api/nonexistent');

      expect(notFoundEndpoint.status).toBe(404);
      expect(notFoundEndpoint.body.success).toBe(false);
      expect(notFoundEndpoint.body.message).toBe('Route not found');
    });
  });
});