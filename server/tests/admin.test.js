const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const { generateToken } = require('../utils/auth');

describe('Admin API Endpoints', () => {
  let adminToken;
  let doctorToken;
  let patientToken;
  let adminUser;
  let doctorUser;
  let patientUser;

  beforeEach(async () => {
    // Clean up database
    await User.deleteMany({});

    // Create admin user
    adminUser = new User({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin'
    });
    await adminUser.save();

    // Create doctor user (pending approval)
    doctorUser = new User({
      name: 'Doctor User',
      email: 'doctor@example.com',
      password: 'password123',
      role: 'doctor'
    });
    await doctorUser.save();

    // Create patient user
    patientUser = new User({
      name: 'Patient User',
      email: 'patient@example.com',
      password: 'password123',
      role: 'patient'
    });
    await patientUser.save();

    // Generate tokens
    adminToken = generateToken({
      id: adminUser._id,
      email: adminUser.email,
      role: adminUser.role
    });

    doctorToken = generateToken({
      id: doctorUser._id,
      email: doctorUser.email,
      role: doctorUser.role
    });

    patientToken = generateToken({
      id: patientUser._id,
      email: patientUser.email,
      role: patientUser.role
    });
  });

  describe('GET /api/admin/doctors/pending', () => {
    it('should get pending doctors for admin', async () => {
      const response = await request(app)
        .get('/api/admin/doctors/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.doctors).toHaveLength(1);
      expect(response.body.data.doctors[0].email).toBe('doctor@example.com');
      expect(response.body.data.doctors[0].approvalStatus).toBe('pending');
    });

    it('should reject access for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/doctors/pending')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Insufficient permissions.');
    });

    it('should reject access for patient users', async () => {
      const response = await request(app)
        .get('/api/admin/doctors/pending')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Insufficient permissions.');
    });

    it('should reject access without token', async () => {
      const response = await request(app)
        .get('/api/admin/doctors/pending')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. No token provided.');
    });
  });

  describe('GET /api/admin/doctors', () => {
    it('should get all doctors for admin', async () => {
      // Create another doctor
      const approvedDoctor = new User({
        name: 'Approved Doctor',
        email: 'approved@example.com',
        password: 'password123',
        role: 'doctor',
        approvalStatus: 'approved'
      });
      await approvedDoctor.save();

      const response = await request(app)
        .get('/api/admin/doctors')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.doctors).toHaveLength(2);
      expect(response.body.data.count).toBe(2);
    });

    it('should reject access for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/doctors')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/admin/doctors/:doctorId/approve', () => {
    it('should approve a doctor', async () => {
      const response = await request(app)
        .put(`/api/admin/doctors/${doctorUser._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Verified credentials' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.doctor.approvalStatus).toBe('approved');
      expect(response.body.data.reason).toBe('Verified credentials');

      // Verify in database
      const updatedDoctor = await User.findById(doctorUser._id);
      expect(updatedDoctor.approvalStatus).toBe('approved');
    });

    it('should approve doctor without reason', async () => {
      const response = await request(app)
        .put(`/api/admin/doctors/${doctorUser._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reason).toBe('No reason provided');
    });

    it('should return 404 for non-existent doctor', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .put(`/api/admin/doctors/${fakeId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Doctor not found');
    });

    it('should return 400 for non-doctor user', async () => {
      const response = await request(app)
        .put(`/api/admin/doctors/${patientUser._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User is not a doctor');
    });

    it('should reject access for non-admin users', async () => {
      const response = await request(app)
        .put(`/api/admin/doctors/${doctorUser._id}/approve`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/admin/doctors/:doctorId/reject', () => {
    it('should reject a doctor', async () => {
      const response = await request(app)
        .put(`/api/admin/doctors/${doctorUser._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Invalid credentials' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.doctor.approvalStatus).toBe('rejected');
      expect(response.body.data.reason).toBe('Invalid credentials');

      // Verify in database
      const updatedDoctor = await User.findById(doctorUser._id);
      expect(updatedDoctor.approvalStatus).toBe('rejected');
    });

    it('should reject doctor without reason', async () => {
      const response = await request(app)
        .put(`/api/admin/doctors/${doctorUser._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reason).toBe('No reason provided');
    });

    it('should return 404 for non-existent doctor', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .put(`/api/admin/doctors/${fakeId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Doctor not found');
    });

    it('should return 400 for non-doctor user', async () => {
      const response = await request(app)
        .put(`/api/admin/doctors/${patientUser._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User is not a doctor');
    });

    it('should reject access for non-admin users', async () => {
      const response = await request(app)
        .put(`/api/admin/doctors/${doctorUser._id}/reject`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});