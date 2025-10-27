const mongoose = require('mongoose');

const patientProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    unique: true
  },
  // Required fields
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [1, 'Age must be at least 1'],
    max: [120, 'Age cannot exceed 120']
  },
  height_cm: {
    type: Number,
    required: [true, 'Height is required'],
    min: [50, 'Height must be at least 50 cm'],
    max: [300, 'Height cannot exceed 300 cm']
  },
  weight_kg: {
    type: Number,
    required: [true, 'Weight is required'],
    min: [10, 'Weight must be at least 10 kg'],
    max: [500, 'Weight cannot exceed 500 kg']
  },
  diseaseCondition: {
    type: String,
    required: [true, 'Disease condition is required'],
    trim: true,
    maxlength: [200, 'Disease condition cannot exceed 200 characters']
  },
  mealPreference: {
    type: String,
    enum: {
      values: ['Vegetarian', 'Non-Vegetarian', 'Mixed'],
      message: 'Meal preference must be Vegetarian, Non-Vegetarian, or Mixed'
    },
    required: [true, 'Meal preference is required']
  },
  activityLevel: {
    type: String,
    enum: {
      values: ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active'],
      message: 'Activity level must be Sedentary, Lightly Active, Moderately Active, or Very Active'
    },
    required: [true, 'Activity level is required']
  },
  healthGoal: {
    type: String,
    enum: {
      values: ['Weight Loss', 'Weight Maintenance', 'Muscle Gain', 'Manage Condition'],
      message: 'Health goal must be Weight Loss, Weight Maintenance, Muscle Gain, or Manage Condition'
    },
    required: [true, 'Health goal is required']
  },
  // Optional fields
  bloodPressure: {
    type: String,
    trim: true,
    match: [
      /^\d{2,3}\/\d{2,3}$/,
      'Blood pressure must be in format XXX/XX (e.g., 120/80)'
    ]
  },
  bloodGroup: {
    type: String,
    trim: true,
    enum: {
      values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      message: 'Blood group must be A+, A-, B+, B-, AB+, AB-, O+, or O-'
    }
  },
  medicalSummary: {
    type: String,
    trim: true,
    maxlength: [1000, 'Medical summary cannot exceed 1000 characters']
  },
  allergies: [{
    type: String,
    trim: true,
    maxlength: [100, 'Each allergy cannot exceed 100 characters']
  }],
  dislikedItems: [{
    type: String,
    trim: true,
    maxlength: [100, 'Each disliked item cannot exceed 100 characters']
  }],
  // Location fields for regional food recommendations
  location: {
    country: {
      type: String,
      trim: true,
      maxlength: [100, 'Country name cannot exceed 100 characters']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [100, 'State name cannot exceed 100 characters']
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, 'City name cannot exceed 100 characters']
    }
  }
}, {
  timestamps: true
});

// User index is created automatically by unique: true

// Virtual for BMI calculation
patientProfileSchema.virtual('bmi').get(function() {
  const heightInMeters = this.height_cm / 100;
  return (this.weight_kg / (heightInMeters * heightInMeters)).toFixed(1);
});

// Include virtuals when converting to JSON
patientProfileSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('PatientProfile', patientProfileSchema);