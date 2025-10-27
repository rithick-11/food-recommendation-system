const request = require('supertest');
const express = require('express');
const User = require('../../models/User');
const { authenticate, authorize, requirePatient, requireDoctor } = require('../../middleware/auth');
const { generateToken } = require('../../utils/auth');

// Create test app
const createTestApp = (middleware) => {
  const app = express();
  app.use(express.json());
  
  // Protected route with middleware
  app.get('/protected', middleware, (req, res) => {
    res.json({
      success: true,
      user: req.user
    });
  });
  
  return app;
};

describe('Authentication Middleware', () => {
  let testUser;
  let testToken;

  beforeEach(async () => {
    // Clean up and create test user
    await User.deleteMany({});
    
    testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
      role: 'patient'
    });
    await testUser.save();

    testToken = generateToken({
      id: testUser._id,
      email: testUser.email,
      role: testUser.role
    });
  });

  describe('authenticate middleware', () => {
    const app = createTestApp(authenticate);

    it('should authenticate user with valid token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.password).toBeUndefined();
    });

    it('should authenticate user with token without Bearer prefix', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', testToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject request without authorization header', async () => {
      const response = await request(app)
        .get('/protected');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });

    it('should reject request with empty token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer ');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token format');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token');
    });

    it('should reject request when user not found', async () => {
      // Delete the user but keep the token
      await User.findByIdAndDelete(testUser._id);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('User not found');
    });
  });

  describe('authorize middleware', () => {
    it('should allow access for correct role', async () => {
      const app = createTestApp([authenticate, authorize(['patient'])]);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should deny access for incorrect role', async () => {
      const app = createTestApp([authenticate, authorize(['doctor'])]);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient permissions');
    });

    it('should allow access for multiple allowed roles', async () => {
      const app = createTestApp([authenticate, authorize(['patient', 'doctor'])]);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('role-specific middleware', () => {
    it('requirePatient should allow patient access', async () => {
      const app = createTestApp([authenticate, requirePatient]);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('requireDoctor should deny patient access', async () => {
      const app = createTestApp([authenticate, requireDoctor]);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('requireDoctor should allow doctor access', async () => {
      // Create doctor user and token
      const doctorUser = new User({
        name: 'Doctor User',
        email: 'doctor@example.com',
        password: 'hashedpassword',
        role: 'doctor'
      });
      await doctorUser.save();

      const doctorToken = generateToken({
        id: doctorUser._id,
        email: doctorUser.email,
        role: doctorUser.role
      });

      const app = createTestApp([authenticate, requireDoctor]);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});