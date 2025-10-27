const User = require('../../models/User');
const PatientProfile = require('../../models/PatientProfile');

describe('PatientProfile Model', () => {
  let testUser;

  beforeEach(async () => {
    await PatientProfile.deleteMany({});
    await User.deleteMany({});

    // Create a test user
    testUser = new User({
      name: 'Test Patient',
      email: 'patient@example.com',
      password: 'password123',
      role: 'patient'
    });
    await testUser.save();
  });

  describe('PatientProfile Creation', () => {
    test('should create a valid patient profile with required fields', async () => {
      const profileData = {
        user: testUser._id,
        age: 30,
        height_cm: 175,
        weight_kg: 70,
        diseaseCondition: 'Diabetes',
        mealPreference: 'Vegetarian',
        activityLevel: 'Moderately Active',
        healthGoal: 'Weight Maintenance'
      };

      const profile = new PatientProfile(profileData);
      const savedProfile = await profile.save();

      expect(savedProfile._id).toBeDefined();
      expect(savedProfile.user.toString()).toBe(testUser._id.toString());
      expect(savedProfile.age).toBe(profileData.age);
      expect(savedProfile.height_cm).toBe(profileData.height_cm);
      expect(savedProfile.weight_kg).toBe(profileData.weight_kg);
    });

    test('should fail to create profile without required fields', async () => {
      const profile = new PatientProfile({});
      await expect(profile.save()).rejects.toThrow();
    });

    test('should validate enum values for mealPreference', async () => {
      const profileData = {
        user: testUser._id,
        age: 30,
        height_cm: 175,
        weight_kg: 70,
        diseaseCondition: 'Diabetes',
        mealPreference: 'Invalid Preference',
        activityLevel: 'Moderately Active',
        healthGoal: 'Weight Maintenance'
      };

      const profile = new PatientProfile(profileData);
      await expect(profile.save()).rejects.toThrow();
    });

    test('should validate enum values for activityLevel', async () => {
      const profileData = {
        user: testUser._id,
        age: 30,
        height_cm: 175,
        weight_kg: 70,
        diseaseCondition: 'Diabetes',
        mealPreference: 'Vegetarian',
        activityLevel: 'Invalid Activity',
        healthGoal: 'Weight Maintenance'
      };

      const profile = new PatientProfile(profileData);
      await expect(profile.save()).rejects.toThrow();
    });

    test('should validate enum values for healthGoal', async () => {
      const profileData = {
        user: testUser._id,
        age: 30,
        height_cm: 175,
        weight_kg: 70,
        diseaseCondition: 'Diabetes',
        mealPreference: 'Vegetarian',
        activityLevel: 'Moderately Active',
        healthGoal: 'Invalid Goal'
      };

      const profile = new PatientProfile(profileData);
      await expect(profile.save()).rejects.toThrow();
    });

    test('should validate blood pressure format', async () => {
      const profileData = {
        user: testUser._id,
        age: 30,
        height_cm: 175,
        weight_kg: 70,
        diseaseCondition: 'Diabetes',
        mealPreference: 'Vegetarian',
        activityLevel: 'Moderately Active',
        healthGoal: 'Weight Maintenance',
        bloodPressure: 'invalid-format'
      };

      const profile = new PatientProfile(profileData);
      await expect(profile.save()).rejects.toThrow();
    });

    test('should accept valid blood pressure format', async () => {
      const profileData = {
        user: testUser._id,
        age: 30,
        height_cm: 175,
        weight_kg: 70,
        diseaseCondition: 'Diabetes',
        mealPreference: 'Vegetarian',
        activityLevel: 'Moderately Active',
        healthGoal: 'Weight Maintenance',
        bloodPressure: '120/80'
      };

      const profile = new PatientProfile(profileData);
      const savedProfile = await profile.save();
      expect(savedProfile.bloodPressure).toBe('120/80');
    });
  });

  describe('BMI Virtual Field', () => {
    test('should calculate BMI correctly', async () => {
      const profileData = {
        user: testUser._id,
        age: 30,
        height_cm: 175,
        weight_kg: 70,
        diseaseCondition: 'Diabetes',
        mealPreference: 'Vegetarian',
        activityLevel: 'Moderately Active',
        healthGoal: 'Weight Maintenance'
      };

      const profile = new PatientProfile(profileData);
      await profile.save();

      const expectedBMI = (70 / (1.75 * 1.75)).toFixed(1);
      expect(profile.bmi).toBe(expectedBMI);
    });
  });

  describe('User Reference Relationship', () => {
    test('should enforce unique user constraint', async () => {
      const profileData = {
        user: testUser._id,
        age: 30,
        height_cm: 175,
        weight_kg: 70,
        diseaseCondition: 'Diabetes',
        mealPreference: 'Vegetarian',
        activityLevel: 'Moderately Active',
        healthGoal: 'Weight Maintenance'
      };

      const profile1 = new PatientProfile(profileData);
      await profile1.save();

      const profile2 = new PatientProfile(profileData);
      await expect(profile2.save()).rejects.toThrow();
    });
  });
});