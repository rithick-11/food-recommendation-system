const User = require("../../models/User");

describe("User Model", () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe("User Creation", () => {
    test("should create a valid user with required fields", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        role: "patient",
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.name).toBe(userData.name);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.role).toBe(userData.role);
      expect(savedUser.password).not.toBe(userData.password); // Should be hashed
    });

    test("should fail to create user without required fields", async () => {
      const user = new User({});

      await expect(user.save()).rejects.toThrow();
    });

    test("should fail to create user with invalid email", async () => {
      const userData = {
        name: "John Doe",
        email: "invalid-email",
        password: "password123",
        role: "patient",
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    test("should fail to create user with invalid role", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        role: "invalid-role",
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    test("should enforce unique email constraint", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        role: "patient",
      };

      const user1 = new User(userData);
      await user1.save();

      const user2 = new User(userData);
      await expect(user2.save()).rejects.toThrow();
    });
  });

  describe("Password Methods", () => {
    test("should hash password before saving", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        role: "patient",
      };

      const user = new User(userData);
      await user.save();

      expect(user.password).not.toBe(userData.password);
      expect(user.password.length).toBeGreaterThan(userData.password.length);
    });

    test("should compare password correctly", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        role: "patient",
      };

      const user = new User(userData);
      await user.save();

      const isMatch = await user.comparePassword("password123");
      expect(isMatch).toBe(true);

      const isNotMatch = await user.comparePassword("wrongpassword");
      expect(isNotMatch).toBe(false);
    });
  });

  describe("JSON Serialization", () => {
    test("should not include password in JSON output", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        role: "patient",
      };

      const user = new User(userData);
      await user.save();

      const userJSON = user.toJSON();
      expect(userJSON.password).toBeUndefined();
      expect(userJSON.name).toBe(userData.name);
      expect(userJSON.email).toBe(userData.email);
    });
  });
});
