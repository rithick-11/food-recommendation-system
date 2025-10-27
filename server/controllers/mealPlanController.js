const MealPlan = require("../models/MealPlan");
const PatientProfile = require("../models/PatientProfile");
const GeminiClient = require("../utils/geminiClient");

// Initialize GeminiClient instance
let geminiClient;
try {
  geminiClient = new GeminiClient();
  console.log("GeminiClient initialized successfully");
} catch (error) {
  console.warn("GeminiClient initialization failed:", error.message);
  console.log("Will use mock meal plan generator as fallback");
  // Create a mock client that always uses the fallback
  geminiClient = {
    generateMealPlan: async (patientProfile) => {
      const MockMealPlanGenerator = require("../utils/mockMealPlan");
      const mockGenerator = new MockMealPlanGenerator();
      return mockGenerator.generateMealPlan(patientProfile);
    },
  };
}

/**
 * Generate meal plan for authenticated patient (self-service)
 * POST /api/mealplan/generate
 */
const generateForPatient = async (req, res) => {
  try {
    const userId = req.user.id;
    const { dayCount = 1 } = req.body;

    // Validate dayCount
    if (!Number.isInteger(dayCount) || dayCount < 1 || dayCount > 7) {
      return res.status(400).json({
        success: false,
        message: "Day count must be an integer between 1 and 7",
        code: "INVALID_DAY_COUNT",
      });
    }

    // Find patient profile
    const patientProfile = await PatientProfile.findOne({ user: userId });
    if (!patientProfile) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found. Please create your profile first.",
        code: "PROFILE_NOT_FOUND",
      });
    }

    // Generate meal plan using Gemini API (with fallback to mock)
    const mealPlanData = await geminiClient.generateMealPlan(patientProfile, dayCount);

    // Create and save meal plan
    const mealPlanDocument = {
      patient: patientProfile._id,
      dayCount: dayCount,
      summary: mealPlanData.summary,
    };

    if (dayCount === 1) {
      // Single day meal plan (backward compatibility)
      mealPlanDocument.meals = mealPlanData.meals;
    } else {
      // Multi-day meal plan
      mealPlanDocument.dailyMeals = mealPlanData.dailyMeals;
      mealPlanDocument.dailySummaries = mealPlanData.dailySummaries;
    }

    const mealPlan = new MealPlan(mealPlanDocument);

    await mealPlan.save();

    // Populate patient data for response
    await mealPlan.populate("patient");

    const responseData = {
      id: mealPlan._id,
      generatedAt: mealPlan.generatedAt,
      dayCount: mealPlan.dayCount,
      summary: mealPlan.summary,
      patient: {
        id: mealPlan.patient._id,
        name: mealPlan.patient.user ? "Patient" : "Unknown", // Avoid exposing user details
        healthGoal: mealPlan.patient.healthGoal,
        mealPreference: mealPlan.patient.mealPreference,
      },
    };

    if (dayCount === 1) {
      responseData.meals = mealPlan.meals;
    } else {
      responseData.dailyMeals = mealPlan.dailyMeals;
      responseData.dailySummaries = mealPlan.dailySummaries;
    }

    res.status(201).json({
      success: true,
      message: `${dayCount}-day meal plan generated successfully`,
      data: {
        mealPlan: responseData,
      },
    });
  } catch (error) {
    console.error("Error generating meal plan for patient:", error);

    if (error.message.includes("Failed to generate meal plan")) {
      return res.status(503).json({
        success: false,
        message:
          "Unable to generate meal plan at this time. Please try again later.",
        error: "External service unavailable",
        code: "GEMINI_API_ERROR",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error while generating meal plan",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
};

/**
 * Generate meal plan for specific patient (doctor use)
 * POST /api/mealplan/generate/:patientId
 */
const generateForPatientByDoctor = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { dayCount = 1 } = req.body;

    // Validate dayCount
    if (!Number.isInteger(dayCount) || dayCount < 1 || dayCount > 7) {
      return res.status(400).json({
        success: false,
        message: "Day count must be an integer between 1 and 7",
        code: "INVALID_DAY_COUNT",
      });
    }

    // Verify doctor role (middleware should handle this, but double-check)
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Doctor role required.",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    // Find patient profile
    const patientProfile = await PatientProfile.findById(patientId).populate(
      "user",
      "name email"
    );
    if (!patientProfile) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
        code: "PROFILE_NOT_FOUND",
      });
    }

    // Check if GeminiClient is available
    if (!geminiClient) {
      return res.status(503).json({
        success: false,
        message: "Meal plan generation service is currently unavailable",
        code: "SERVICE_UNAVAILABLE",
      });
    }

    // Generate meal plan using Gemini API
    const mealPlanData = await geminiClient.generateMealPlan(patientProfile, dayCount);

    // Create and save meal plan
    const mealPlanDocument = {
      patient: patientProfile._id,
      dayCount: dayCount,
      summary: mealPlanData.summary,
    };

    if (dayCount === 1) {
      // Single day meal plan (backward compatibility)
      mealPlanDocument.meals = mealPlanData.meals;
    } else {
      // Multi-day meal plan
      mealPlanDocument.dailyMeals = mealPlanData.dailyMeals;
      mealPlanDocument.dailySummaries = mealPlanData.dailySummaries;
    }

    const mealPlan = new MealPlan(mealPlanDocument);

    await mealPlan.save();

    // Populate patient data for response
    await mealPlan.populate("patient");

    const responseData = {
      id: mealPlan._id,
      generatedAt: mealPlan.generatedAt,
      dayCount: mealPlan.dayCount,
      summary: mealPlan.summary,
      patient: {
        id: mealPlan.patient._id,
        name: patientProfile.user.name,
        email: patientProfile.user.email,
        healthGoal: mealPlan.patient.healthGoal,
        mealPreference: mealPlan.patient.mealPreference,
        diseaseCondition: mealPlan.patient.diseaseCondition,
      },
    };

    if (dayCount === 1) {
      responseData.meals = mealPlan.meals;
    } else {
      responseData.dailyMeals = mealPlan.dailyMeals;
      responseData.dailySummaries = mealPlan.dailySummaries;
    }

    res.status(201).json({
      success: true,
      message: `${dayCount}-day meal plan generated successfully for patient ${patientProfile.user.name}`,
      data: {
        mealPlan: responseData,
      },
    });
  } catch (error) {
    console.error("Error generating meal plan for patient by doctor:", error);

    if (error.message.includes("Failed to generate meal plan")) {
      return res.status(503).json({
        success: false,
        message:
          "Unable to generate meal plan at this time. Please try again later.",
        error: "External service unavailable",
        code: "GEMINI_API_ERROR",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error while generating meal plan",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
};

/**
 * Get most recent meal plan for authenticated patient
 * GET /api/mealplan/me
 */
const getPatientMealPlan = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find patient profile
    const patientProfile = await PatientProfile.findOne({ user: userId });
    if (!patientProfile) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found. Please create your profile first.",
        code: "PROFILE_NOT_FOUND",
      });
    }

    // Get most recent meal plan
    const mealPlan = await MealPlan.getLatestForPatient(patientProfile._id);

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message:
          "No meal plan found. Generate your first meal plan to get started.",
        code: "MEAL_PLAN_NOT_FOUND",
      });
    }

    const responseData = {
      id: mealPlan._id,
      generatedAt: mealPlan.generatedAt,
      dayCount: mealPlan.dayCount || 1,
      summary: mealPlan.summary,
      daysAgo: Math.floor(
        (Date.now() - mealPlan.generatedAt) / (1000 * 60 * 60 * 24)
      ),
    };

    if (mealPlan.dayCount === 1 || !mealPlan.dayCount) {
      // Single day meal plan (backward compatibility)
      responseData.meals = mealPlan.meals;
    } else {
      // Multi-day meal plan
      responseData.dailyMeals = mealPlan.dailyMeals;
      responseData.dailySummaries = mealPlan.dailySummaries;
    }

    res.status(200).json({
      success: true,
      message: "Meal plan retrieved successfully",
      data: {
        mealPlan: responseData,
      },
    });
  } catch (error) {
    console.error("Error retrieving patient meal plan:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving meal plan",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
};

/**
 * Get most recent meal plan for specific patient (doctor access)
 * GET /api/mealplan/:patientId
 */
const getPatientMealPlanByDoctor = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Verify doctor role
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Doctor role required.",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    // Verify patient profile exists
    const patientProfile = await PatientProfile.findById(patientId).populate(
      "user",
      "name email"
    );
    if (!patientProfile) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
        code: "PROFILE_NOT_FOUND",
      });
    }

    // Get most recent meal plan
    const mealPlan = await MealPlan.getLatestForPatient(patientId);

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: `No meal plan found for patient ${patientProfile.user.name}`,
        code: "MEAL_PLAN_NOT_FOUND",
        data: {
          patient: {
            id: patientProfile._id,
            name: patientProfile.user.name,
            email: patientProfile.user.email,
          },
        },
      });
    }

    const responseData = {
      id: mealPlan._id,
      generatedAt: mealPlan.generatedAt,
      dayCount: mealPlan.dayCount || 1,
      summary: mealPlan.summary,
      daysAgo: Math.floor(
        (Date.now() - mealPlan.generatedAt) / (1000 * 60 * 60 * 24)
      ),
      patient: {
        id: mealPlan.patient._id,
        name: patientProfile.user.name,
        email: patientProfile.user.email,
        healthGoal: mealPlan.patient.healthGoal,
        mealPreference: mealPlan.patient.mealPreference,
        diseaseCondition: mealPlan.patient.diseaseCondition,
      },
    };

    if (mealPlan.dayCount === 1 || !mealPlan.dayCount) {
      // Single day meal plan (backward compatibility)
      responseData.meals = mealPlan.meals;
    } else {
      // Multi-day meal plan
      responseData.dailyMeals = mealPlan.dailyMeals;
      responseData.dailySummaries = mealPlan.dailySummaries;
    }

    res.status(200).json({
      success: true,
      message: `Meal plan retrieved successfully for patient ${patientProfile.user.name}`,
      data: {
        mealPlan: responseData,
      },
    });
  } catch (error) {
    console.error("Error retrieving patient meal plan by doctor:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving meal plan",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
};

/**
 * Get meal plan history for specific patient (doctor access)
 * GET /api/mealplan/:patientId/history
 */
const getPatientMealPlanHistory = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { limit = 10, page = 1 } = req.query;

    // Verify doctor role
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Doctor role required.",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    // Verify patient profile exists
    const patientProfile = await PatientProfile.findById(patientId).populate(
      "user",
      "name email"
    );
    if (!patientProfile) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
        code: "PROFILE_NOT_FOUND",
      });
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get meal plan history with pagination
    const mealPlans = await MealPlan.find({ patient: patientId })
      .sort({ generatedAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count for pagination info
    const totalCount = await MealPlan.countDocuments({ patient: patientId });
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.status(200).json({
      success: true,
      message: `Meal plan history retrieved successfully for patient ${patientProfile.user.name}`,
      data: {
        mealPlans: mealPlans.map((plan) => {
          const planData = {
            id: plan._id,
            generatedAt: plan.generatedAt,
            dayCount: plan.dayCount || 1,
            summary: plan.summary,
            daysAgo: Math.floor(
              (Date.now() - plan.generatedAt) / (1000 * 60 * 60 * 24)
            ),
          };

          if (plan.dayCount === 1 || !plan.dayCount) {
            planData.meals = plan.meals;
          } else {
            planData.dailyMeals = plan.dailyMeals;
            planData.dailySummaries = plan.dailySummaries;
          }

          return planData;
        }),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
        patient: {
          id: patientProfile._id,
          name: patientProfile.user.name,
          email: patientProfile.user.email,
          healthGoal: patientProfile.healthGoal,
          mealPreference: patientProfile.mealPreference,
          diseaseCondition: patientProfile.diseaseCondition,
        },
      },
    });
  } catch (error) {
    console.error(
      "Error retrieving patient meal plan history by doctor:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving meal plan history",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
};

module.exports = {
  generateForPatient,
  generateForPatientByDoctor,
  getPatientMealPlan,
  getPatientMealPlanByDoctor,
  getPatientMealPlanHistory,
};
