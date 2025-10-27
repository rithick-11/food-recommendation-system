const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const { generateToken, verifyToken, hashPassword, comparePassword } = require('../utils/auth');

describe('Authentication System', () => {
  // Clean up database before each test
  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('JWT Utilities', () => {
    describe('generateToken', () => {
      it('should generate a valid JWT token', () => {
        const payload = { id: '123', email: 'test@example.com', role: 'patient' };
        const token = generateToken(payload);
        
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
      });
    });

    describe('verifyToken', () => {
      it('should verify a valid token', () => {
        const payload = { id: '123', email: 'test@example.com', role: 'patient' };
        const token = generateToken(payload);
        
        const decoded = verifyToken(token);
        
        expect(decoded.id).toBe(payload.id);
        expect(decoded.email).toBe(payload.email);
        expect(decoded.role).toBe(payload.role);
      });

      it('should throw error for invalid token', () => {
        expect(() => {
          verifyToken('invalid-token');
        }).toThrow();
      });
    });

    describe('Password Hashing', () => {
      it('should hash password correctly', async () => {
        const password = 'testpassword123';
        const hashedPassword = await hashPassword(password);
        
        expect(hashedPassword).toBeDefined();
        expect(hashedPassword).not.toBe(password);
        expect(hashedPassword.length).toBeGreaterThan(50);
      });

      it('should compare passwords correctly', async () => {
        const password = 'testpassword123';
        const hashedPassword = await hashPassword(password);
        
        const isMatch = await comparePassword(password, hashedPassword);
        const isNotMatch = await comparePassword('wrongpassword', hashedPassword);
        
        expect(isMatch).toBe(true);
        expect(isNotMatch).toBe(false);
      });
    });
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'patient'
    };

    it('should register a new patient successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data.user).toMatchObject({
        name: validUserData.name,
        email: validUserData.email,
        role: validUserData.role
      });
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should register a new doctor successfully', async () => {
      const doctorData = { ...validUserData, role: 'doctor' };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(doctorData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('doctor');
    });

    it('should reject registration with missing fields', async () => {
      const incompleteData = { name: 'John Doe', email: 'john@example.com' };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('All fields are required');
    });

    it('should reject registration with invalid role', async () => {
      const invalidRoleData = { ...validUserData, role: 'admin' };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidRoleData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Role must be either "patient" or "doctor"');
    });

    it('should reject registration with invalid email format', async () => {
      const invalidEmailData = { ...validUserData, email: 'invalid-email' };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidEmailData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('valid email address');
    });

    it('should reject registration with short password', async () => {
      const shortPasswordData = { ...validUserData, password: '123' };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(shortPasswordData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('at least 6 characters');
    });

    it('should reject registration with duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    const userData = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
      role: 'patient'
    };

    beforeEach(async () => {
      // Clean up any existing users
      await User.deleteMany({});
      
      // Register a user for login tests
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);
      
      // Ensure registration was successful
      expect(registerResponse.status).toBe(201);
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.user).toMatchObject({
        name: userData.name,
        email: userData.email,
        role: userData.role
      });
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should reject login with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email and password are required');
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: userData.password
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should handle case-insensitive email login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email.toUpperCase(),
          password: userData.password
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});