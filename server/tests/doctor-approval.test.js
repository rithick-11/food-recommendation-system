const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const PatientProfile = require('../models/PatientProfile');
const { generateToken } = require('../utils/auth');

describe('Doctor Approval Access Control', () => {
  let pendingDoctorToken;
  let approvedDoctorToken;
  let rejectedDoctorToken;
  let patientToken;
  let patientUser;
  let patientProfile;

  beforeEach(async () => {
    // Clean up database
    await User.deleteMany({});
    await PatientProfile.deleteMany({});

    // Create patient user and profile
    patientUser = new User({
      name: 'Test Patient',
      email: 'patient@test.com',
      password: 'password123',
      role: 'patient'
    });
    await patientUser.save();

    patientProfile = new PatientProfile({
      user: patientUser._id,
      age: 30,
      height_cm: 170,
      weight_kg: 70,
      diseaseCondition: 'None',
      mealPreference: 'Vegetarian',
      activityLevel: 'Moderately Active',
      healthGoal: 'Weight Maintenance'
    });
    await patientProfile.save();

    // Create pending doctor
    const pendingDoctor = new User({
      name: 'Pending Doctor',
      email: 'pending@test.com',
      password: 'password123',
      role: 'doctor',
      approvalStatus: 'pending'
    });
    await pendingDoctor.save();

    // Create approved doctor
    const approvedDoctor = new User({
      name: 'Approved Doctor',
      email: 'approved@test.com',
      password: 'password123',
      role: 'doctor',
      approvalStatus: 'approved'
    });
    await approvedDoctor.save();

    // Create rejected doctor
    const rejectedDoctor = new User({
      name: 'Rejected Doctor',
      email: 'rejected@test.com',
      password: 'password123',
      role: 'doctor',
      approvalStatus: 'rejected'
    });
    await rejectedDoctor.save();

    // Generate tokens
    pendingDoctorToken = generateToken({
      id: pendingDoctor._id,
      email: pendingDoctor.email,
      role: pendingDoctor.role
    });

    approvedDoctorToken = generateToken({
      id: approvedDoctor._id,
      email: approvedDoctor.email,
      role: approvedDoctor.role
    });

    rejectedDoctorToken = generateToken({
      id: rejectedDoctor._id,
      email: rejectedDoctor.email,
      role: rejectedDoctor.role
    });

    patientToken = generateToken({
      id: patientUser._id,
      email: patientUser.email,
      role: patientUser.role
    });
  });

  describe('Doctor Routes Access Control', () => {
    describe('GET /api/patients', () => {
      it('should allow approved doctors to access patients list', async () => {
        const response = await request(app)
          .get('/api/patients')
          .set('Authorization', `Bearer ${approvedDoctorToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.patients)).toBe(true);
      });

      it('should deny pending doctors access to patients list', async () => {
        const response = await request(app)
          .get('/api/patients')
          .set('Authorization', `Bearer ${pendingDoctorToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Access denied. Doctor approval pending. Please wait for admin approval.');
        expect(response.body.code).toBe('DOCTOR_NOT_APPROVED');
      });

      it('should deny rejected doctors access to patients list', async () => {
        const response = await request(app)
          .get('/api/patients')
          .set('Authorization', `Bearer ${rejectedDoctorToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Access denied. Doctor approval pending. Please wait for admin approval.');
        expect(response.body.code).toBe('DOCTOR_NOT_APPROVED');
      });
    });

    describe('GET /api/patients/profile/:patientId', () => {
      it('should allow approved doctors to access patient profiles', async () => {
        const response = await request(app)
          .get(`/api/patients/profile/${patientProfile._id}`)
          .set('Authorization', `Bearer ${approvedDoctorToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.profile).toBeDefined();
      });

      it('should deny pending doctors access to patient profiles', async () => {
        const response = await request(app)
          .get(`/api/patients/profile/${patientProfile._id}`)
          .set('Authorization', `Bearer ${pendingDoctorToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('DOCTOR_NOT_APPROVED');
      });
    });
  });

  describe('Meal Plan Routes Access Control', () => {
    describe('POST /api/mealplan/generate/:patientId', () => {
      it('should allow approved doctors to generate meal plans', async () => {
        // This will likely fail due to Gemini API, but should pass authentication
        const response = await request(app)
          .post(`/api/mealplan/generate/${patientProfile._id}`)
          .set('Authorization', `Bearer ${approvedDoctorToken}`)
          .send({ dayCount: 1 });

        // Should not be 403 (forbidden), might be 500 or 503 due to API issues
        expect(response.status).not.toBe(403);
      });

      it('should deny pending doctors from generating meal plans', async () => {
        const response = await request(app)
          .post(`/api/mealplan/generate/${patientProfile._id}`)
          .set('Authorization', `Bearer ${pendingDoctorToken}`)
          .send({ dayCount: 1 })
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('DOCTOR_NOT_APPROVED');
      });
    });

    describe('GET /api/mealplan/:patientId', () => {
      it('should allow approved doctors to view patient meal plans', async () => {
        const response = await request(app)
          .get(`/api/mealplan/${patientProfile._id}`)
          .set('Authorization', `Bearer ${approvedDoctorToken}`);

        // Should not be 403, might be 404 if no meal plan exists
        expect(response.status).not.toBe(403);
      });

      it('should deny pending doctors from viewing patient meal plans', async () => {
        const response = await request(app)
          .get(`/api/mealplan/${patientProfile._id}`)
          .set('Authorization', `Bearer ${pendingDoctorToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('DOCTOR_NOT_APPROVED');
      });
    });
  });

  describe('Patient Access (Should Not Be Affected)', () => {
    it('should still allow patients to access their own meal plan generation', async () => {
      const response = await request(app)
        .post('/api/mealplan/generate')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ dayCount: 1 });

      // Should not be 403, might fail due to API issues but not due to approval
      expect(response.status).not.toBe(403);
    });

    it('should still allow patients to view their own meal plans', async () => {
      const response = await request(app)
        .get('/api/mealplan/me')
        .set('Authorization', `Bearer ${patientToken}`);

      // Should not be 403, might be 404 if no meal plan exists
      expect(response.status).not.toBe(403);
    });
  });
});