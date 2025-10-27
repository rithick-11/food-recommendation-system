const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const PatientProfile = require('../models/PatientProfile');

describe('Profile Management System', () => {
  let patientToken, doctorToken, patientUser, doctorUser, anotherPatientUser;

  // Setup test users and tokens
  beforeEach(async () => {
    // Clean up database
    await User.deleteMany({});
    await PatientProfile.deleteMany({});

    // Create test users
    const patientResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Patient User',
        email: 'patient@example.com',
        password: 'password123',
        role: 'patient'
      });

    const doctorResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Doctor User',
        email: 'doctor@example.com',
        password: 'password123',
        role: 'doctor'
      });

    const anotherPatientResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Another Patient',
        email: 'patient2@example.com',
        password: 'password123',
        role: 'patient'
      });

    patientToken = patientResponse.body.data.token;
    doctorToken = doctorResponse.body.data.token;
    patientUser = patientResponse.body.data.user;
    doctorUser = doctorResponse.body.data.user;
    anotherPatientUser = anotherPatientResponse.body.data.user;
  });

  describe('Patient Profile Self-Management', () => {
    const validProfileData = {
      age: 30,
      height_cm: 175,
      weight_kg: 70,
      diseaseCondition: 'Diabetes Type 2',
      mealPreference: 'Vegetarian',
      activityLevel: 'Moderately Active',
      healthGoal: 'Weight Loss',
      bloodPressure: '120/80',
      bloodGroup: 'B+',
      medicalSummary: 'Well controlled diabetes',
      allergies: ['Nuts', 'Shellfish'],
      dislikedItems: ['Broccoli', 'Spinach']
    };

    describe('POST /api/profile/me', () => {
      it('should create patient profile successfully', async () => {
        const response = await request(app)
          .post('/api/profile/me')
          .set('Authorization', `Bearer ${patientToken}`)
          .send(validProfileData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Profile saved successfully');
        expect(response.body.data).toMatchObject({
          age: validProfileData.age,
          height_cm: validProfileData.height_cm,
          weight_kg: validProfileData.weight_kg,
          diseaseCondition: validProfileData.diseaseCondition,
          mealPreference: validProfileData.mealPreference,
          activityLevel: validProfileData.activityLevel,
          healthGoal: validProfileData.healthGoal
        });
        expect(response.body.data.user.name).toBe(patientUser.name);
      });

      it('should update existing patient profile', async () => {
        // Create initial profile
        await request(app)
          .post('/api/profile/me')
          .set('Authorization', `Bearer ${patientToken}`)
          .send(validProfileData);

        // Update profile
        const updatedData = { ...validProfileData, age: 31, weight_kg: 68 };
        const response = await request(app)
          .post('/api/profile/me')
          .set('Authorization', `Bearer ${patientToken}`)
          .send(updatedData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.age).toBe(31);
        expect(response.body.data.weight_kg).toBe(68);
      });

      it('should reject profile creation with missing required fields', async () => {
        const incompleteData = {
          age: 30,
          height_cm: 175
          // Missing required fields
        };

        const response = await request(app)
          .post('/api/profile/me')
          .set('Authorization', `Bearer ${patientToken}`)
          .send(incompleteData);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Missing required fields');
      });

      it('should reject profile with invalid enum values', async () => {
        const invalidData = {
          ...validProfileData,
          mealPreference: 'Invalid Preference'
        };

        const response = await request(app)
          .post('/api/profile/me')
          .set('Authorization', `Bearer ${patientToken}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Invalid meal preference');
      });

      it('should reject unauthorized access', async () => {
        const response = await request(app)
          .post('/api/profile/me')
          .send(validProfileData);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      it('should reject doctor access to patient route', async () => {
        const response = await request(app)
          .post('/api/profile/me')
          .set('Authorization', `Bearer ${doctorToken}`)
          .send(validProfileData);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/profile/me', () => {
      beforeEach(async () => {
        // Create a profile for the patient
        await request(app)
          .post('/api/profile/me')
          .set('Authorization', `Bearer ${patientToken}`)
          .send(validProfileData);
      });

      it('should retrieve patient profile successfully', async () => {
        const response = await request(app)
          .get('/api/profile/me')
          .set('Authorization', `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          age: validProfileData.age,
          height_cm: validProfileData.height_cm,
          weight_kg: validProfileData.weight_kg,
          diseaseCondition: validProfileData.diseaseCondition
        });
        expect(response.body.data.user.name).toBe(patientUser.name);
      });

      it('should return 404 for patient without profile', async () => {
        // Use another patient without profile
        const anotherPatientResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'patient2@example.com',
            password: 'password123'
          });

        const response = await request(app)
          .get('/api/profile/me')
          .set('Authorization', `Bearer ${anotherPatientResponse.body.data.token}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Profile not found');
      });

      it('should reject unauthorized access', async () => {
        const response = await request(app)
          .get('/api/profile/me');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Doctor Patient Management', () => {
    const validProfileData = {
      age: 35,
      height_cm: 180,
      weight_kg: 75,
      diseaseCondition: 'Hypertension',
      mealPreference: 'Non-Vegetarian',
      activityLevel: 'Lightly Active',
      healthGoal: 'Weight Maintenance',
      bloodPressure: '140/90',
      medicalSummary: 'Controlled hypertension with medication'
    };

    describe('GET /api/patients', () => {
      it('should retrieve all patients for doctor', async () => {
        const response = await request(app)
          .get('/api/patients')
          .set('Authorization', `Bearer ${doctorToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.count).toBe(2); // Two patients created in beforeEach
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data[0]).toHaveProperty('name');
        expect(response.body.data[0]).toHaveProperty('email');
        expect(response.body.data[0]).toHaveProperty('hasProfile');
      });

      it('should reject patient access to doctor route', async () => {
        const response = await request(app)
          .get('/api/patients')
          .set('Authorization', `Bearer ${patientToken}`);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
      });

      it('should reject unauthorized access', async () => {
        const response = await request(app)
          .get('/api/patients');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/patients/profile/:patientId', () => {
      beforeEach(async () => {
        // Create a profile for the patient
        await request(app)
          .post('/api/profile/me')
          .set('Authorization', `Bearer ${patientToken}`)
          .send(validProfileData);
      });

      it('should retrieve specific patient profile for doctor', async () => {
        const response = await request(app)
          .get(`/api/patients/profile/${patientUser.id}`)
          .set('Authorization', `Bearer ${doctorToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          age: validProfileData.age,
          height_cm: validProfileData.height_cm,
          weight_kg: validProfileData.weight_kg,
          diseaseCondition: validProfileData.diseaseCondition
        });
        expect(response.body.data.user.name).toBe(patientUser.name);
      });

      it('should return 404 for non-existent patient', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .get(`/api/patients/profile/${fakeId}`)
          .set('Authorization', `Bearer ${doctorToken}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Patient not found');
      });

      it('should return 404 for patient without profile', async () => {
        const response = await request(app)
          .get(`/api/patients/profile/${anotherPatientUser.id}`)
          .set('Authorization', `Bearer ${doctorToken}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Patient profile not found');
      });

      it('should reject patient access', async () => {
        const response = await request(app)
          .get(`/api/patients/profile/${patientUser.id}`)
          .set('Authorization', `Bearer ${patientToken}`);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /api/patients/profile/:patientId', () => {
      it('should update patient profile for doctor', async () => {
        const response = await request(app)
          .put(`/api/patients/profile/${patientUser.id}`)
          .set('Authorization', `Bearer ${doctorToken}`)
          .send(validProfileData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Patient profile updated successfully');
        expect(response.body.data).toMatchObject({
          age: validProfileData.age,
          height_cm: validProfileData.height_cm,
          weight_kg: validProfileData.weight_kg,
          diseaseCondition: validProfileData.diseaseCondition
        });
      });

      it('should reject update with missing required fields', async () => {
        const incompleteData = {
          age: 30,
          height_cm: 175
          // Missing required fields
        };

        const response = await request(app)
          .put(`/api/patients/profile/${patientUser.id}`)
          .set('Authorization', `Bearer ${doctorToken}`)
          .send(incompleteData);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Missing required fields');
      });

      it('should reject update for non-existent patient', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .put(`/api/patients/profile/${fakeId}`)
          .set('Authorization', `Bearer ${doctorToken}`)
          .send(validProfileData);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Patient not found');
      });

      it('should reject patient access', async () => {
        const response = await request(app)
          .put(`/api/patients/profile/${patientUser.id}`)
          .set('Authorization', `Bearer ${patientToken}`)
          .send(validProfileData);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
      });

      it('should reject unauthorized access', async () => {
        const response = await request(app)
          .put(`/api/patients/profile/${patientUser.id}`)
          .send(validProfileData);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });
  });
});