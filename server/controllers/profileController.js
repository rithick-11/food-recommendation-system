const PatientProfile = require('../models/PatientProfile');
const User = require('../models/User');

/**
 * @desc    Get current user's patient profile
 * @route   GET /api/profile/me
 * @access  Private (Patient only)
 */
const getMyProfile = async (req, res) => {
  try {
    const profile = await PatientProfile.findOne({ user: req.user.id }).populate('user', 'name email');
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @desc    Create or update current user's patient profile
 * @route   POST /api/profile/me
 * @access  Private (Patient only)
 */
const createOrUpdateMyProfile = async (req, res) => {
  try {
    const {
      age,
      height_cm,
      weight_kg,
      bloodPressure,
      bloodGroup,
      medicalSummary,
      diseaseCondition,
      mealPreference,
      allergies,
      dislikedItems,
      activityLevel,
      healthGoal,
      location
    } = req.body;

    // Validate required fields
    const requiredFields = ['age', 'height_cm', 'weight_kg', 'diseaseCondition', 'mealPreference', 'activityLevel', 'healthGoal'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate enum values
    const validMealPreferences = ['Vegetarian', 'Non-Vegetarian', 'Mixed'];
    const validActivityLevels = ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active'];
    const validHealthGoals = ['Weight Loss', 'Weight Maintenance', 'Muscle Gain', 'Manage Condition'];

    if (!validMealPreferences.includes(mealPreference)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meal preference. Must be Vegetarian, Non-Vegetarian, or Mixed'
      });
    }

    if (!validActivityLevels.includes(activityLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid activity level. Must be Sedentary, Lightly Active, Moderately Active, or Very Active'
      });
    }

    if (!validHealthGoals.includes(healthGoal)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid health goal. Must be Weight Loss, Weight Maintenance, Muscle Gain, or Manage Condition'
      });
    }

    // Prepare profile data
    const profileData = {
      user: req.user.id,
      age,
      height_cm,
      weight_kg,
      diseaseCondition,
      mealPreference,
      activityLevel,
      healthGoal
    };

    // Add optional fields if provided
    if (bloodPressure) profileData.bloodPressure = bloodPressure;
    if (bloodGroup) profileData.bloodGroup = bloodGroup;
    if (medicalSummary) profileData.medicalSummary = medicalSummary;
    if (allergies && Array.isArray(allergies)) profileData.allergies = allergies;
    if (dislikedItems && Array.isArray(dislikedItems)) profileData.dislikedItems = dislikedItems;
    if (location && typeof location === 'object') {
      profileData.location = {
        country: location.country || '',
        state: location.state || '',
        city: location.city || ''
      };
    }

    // Use findOneAndUpdate with upsert to create or update
    const profile = await PatientProfile.findOneAndUpdate(
      { user: req.user.id },
      profileData,
      { 
        new: true, 
        upsert: true, 
        runValidators: true 
      }
    ).populate('user', 'name email');

    res.json({
      success: true,
      message: 'Profile saved successfully',
      data: profile
    });
  } catch (error) {
    console.error('Error saving profile:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while saving profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @desc    Get all patients with profiles (for doctors)
 * @route   GET /api/patients
 * @access  Private (Doctor only)
 */
const getAllPatients = async (req, res) => {
  try {
    // Find all users with patient role and populate their profiles
    const patients = await User.find({ role: 'patient' })
      .select('name email createdAt')
      .lean();

    // Get profiles for each patient
    const patientsWithProfiles = await Promise.all(
      patients.map(async (patient) => {
        const profile = await PatientProfile.findOne({ user: patient._id }).lean();
        return {
          ...patient,
          hasProfile: !!profile,
          profile: profile || null
        };
      })
    );

    res.json({
      success: true,
      count: patientsWithProfiles.length,
      data: {
        patients: patientsWithProfiles
      }
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching patients',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @desc    Get specific patient profile (for doctors)
 * @route   GET /api/profile/:patientId
 * @access  Private (Doctor only)
 */
const getPatientProfile = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Verify the patient exists and has patient role
    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    if (patient.role !== 'patient') {
      return res.status(400).json({
        success: false,
        message: 'User is not a patient'
      });
    }

    // Get the patient's profile
    const profile = await PatientProfile.findOne({ user: patientId }).populate('user', 'name email');
    
    // Return patient data even if no profile exists (for creating new profiles)
    const patientData = {
      _id: patient._id,
      name: patient.name,
      email: patient.email,
      role: patient.role,
      profile: profile || null
    };

    res.json({
      success: true,
      data: {
        patient: patientData
      }
    });
  } catch (error) {
    console.error('Error fetching patient profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching patient profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @desc    Update patient profile (for doctors)
 * @route   PUT /api/profile/:patientId
 * @access  Private (Doctor only)
 */
const updatePatientProfile = async (req, res) => {
  try {
    const { patientId } = req.params;
    const {
      age,
      height_cm,
      weight_kg,
      bloodPressure,
      bloodGroup,
      medicalSummary,
      diseaseCondition,
      mealPreference,
      allergies,
      dislikedItems,
      activityLevel,
      healthGoal,
      location
    } = req.body;

    // Verify the patient exists and has patient role
    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    if (patient.role !== 'patient') {
      return res.status(400).json({
        success: false,
        message: 'User is not a patient'
      });
    }

    // Validate required fields
    const requiredFields = ['age', 'height_cm', 'weight_kg', 'diseaseCondition', 'mealPreference', 'activityLevel', 'healthGoal'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate enum values
    const validMealPreferences = ['Vegetarian', 'Non-Vegetarian', 'Mixed'];
    const validActivityLevels = ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active'];
    const validHealthGoals = ['Weight Loss', 'Weight Maintenance', 'Muscle Gain', 'Manage Condition'];

    if (!validMealPreferences.includes(mealPreference)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meal preference. Must be Vegetarian, Non-Vegetarian, or Mixed'
      });
    }

    if (!validActivityLevels.includes(activityLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid activity level. Must be Sedentary, Lightly Active, Moderately Active, or Very Active'
      });
    }

    if (!validHealthGoals.includes(healthGoal)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid health goal. Must be Weight Loss, Weight Maintenance, Muscle Gain, or Manage Condition'
      });
    }

    // Prepare profile data
    const profileData = {
      user: patientId,
      age,
      height_cm,
      weight_kg,
      diseaseCondition,
      mealPreference,
      activityLevel,
      healthGoal
    };

    // Add optional fields if provided
    if (bloodPressure) profileData.bloodPressure = bloodPressure;
    if (bloodGroup) profileData.bloodGroup = bloodGroup;
    if (medicalSummary) profileData.medicalSummary = medicalSummary;
    if (allergies && Array.isArray(allergies)) profileData.allergies = allergies;
    if (dislikedItems && Array.isArray(dislikedItems)) profileData.dislikedItems = dislikedItems;
    if (location && typeof location === 'object') {
      profileData.location = {
        country: location.country || '',
        state: location.state || '',
        city: location.city || ''
      };
    }

    // Update or create the profile
    const profile = await PatientProfile.findOneAndUpdate(
      { user: patientId },
      profileData,
      { 
        new: true, 
        upsert: true, 
        runValidators: true 
      }
    ).populate('user', 'name email');

    res.json({
      success: true,
      message: 'Patient profile updated successfully',
      data: {
        profile: profile
      }
    });
  } catch (error) {
    console.error('Error updating patient profile:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating patient profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getMyProfile,
  createOrUpdateMyProfile,
  getAllPatients,
  getPatientProfile,
  updatePatientProfile
};