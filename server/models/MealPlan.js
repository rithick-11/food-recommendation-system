const mongoose = require('mongoose');

// Schema for individual meal nutritional data
const mealSchema = new mongoose.Schema({
  items: {
    type: String,
    required: [true, 'Meal items are required'],
    trim: true
  },
  carbs_g: {
    type: Number,
    required: [true, 'Carbohydrates value is required'],
    min: [0, 'Carbohydrates cannot be negative']
  },
  protein_g: {
    type: Number,
    required: [true, 'Protein value is required'],
    min: [0, 'Protein cannot be negative']
  },
  fat_g: {
    type: Number,
    required: [true, 'Fat value is required'],
    min: [0, 'Fat cannot be negative']
  },
  fiber_g: {
    type: Number,
    required: [true, 'Fiber value is required'],
    min: [0, 'Fiber cannot be negative']
  },
  calories_kcal: {
    type: Number,
    required: [true, 'Calories value is required'],
    min: [0, 'Calories cannot be negative']
  }
}, { _id: false });

// Schema for nutritional summary
const summarySchema = new mongoose.Schema({
  total_calories_kcal: {
    type: Number,
    required: [true, 'Total calories is required'],
    min: [0, 'Total calories cannot be negative']
  },
  total_protein_g: {
    type: Number,
    required: [true, 'Total protein is required'],
    min: [0, 'Total protein cannot be negative']
  },
  total_carbs_g: {
    type: Number,
    required: [true, 'Total carbohydrates is required'],
    min: [0, 'Total carbohydrates cannot be negative']
  },
  total_fat_g: {
    type: Number,
    required: [true, 'Total fat is required'],
    min: [0, 'Total fat cannot be negative']
  }
}, { _id: false });

// Schema for daily meals structure
const dailyMealsSchema = new mongoose.Schema({
  breakfast: {
    type: mealSchema,
    required: [true, 'Breakfast meal is required']
  },
  lunch: {
    type: mealSchema,
    required: [true, 'Lunch meal is required']
  },
  snacks: {
    type: mealSchema,
    required: [true, 'Snacks meal is required']
  },
  dinner: {
    type: mealSchema,
    required: [true, 'Dinner meal is required']
  }
}, { _id: false });

const mealPlanSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatientProfile',
    required: [true, 'Patient reference is required']
  },
  generatedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  dayCount: {
    type: Number,
    required: [true, 'Day count is required'],
    min: [1, 'Day count must be at least 1'],
    max: [7, 'Day count cannot exceed 7']
  },
  // For backward compatibility with single-day meal plans
  meals: {
    type: dailyMealsSchema,
    required: function() {
      return this.dayCount === 1;
    }
  },
  // For multi-day meal plans
  dailyMeals: {
    type: Map,
    of: dailyMealsSchema,
    required: function() {
      return this.dayCount > 1;
    }
  },
  summary: {
    type: summarySchema,
    required: [true, 'Nutritional summary is required']
  },
  // For multi-day plans, store daily summaries
  dailySummaries: {
    type: Map,
    of: summarySchema,
    required: function() {
      return this.dayCount > 1;
    }
  }
}, {
  timestamps: true
});

// Index for faster patient lookups and sorting by generation date
mealPlanSchema.index({ patient: 1, generatedAt: -1 });

// Static method to get the most recent meal plan for a patient
mealPlanSchema.statics.getLatestForPatient = function(patientId) {
  return this.findOne({ patient: patientId })
    .sort({ generatedAt: -1 })
    .populate('patient');
};

// Instance method to calculate if summary matches individual meals
mealPlanSchema.methods.validateSummary = function() {
  if (this.dayCount === 1) {
    // Single day validation (backward compatibility)
    const { breakfast, lunch, snacks, dinner } = this.meals;
    
    const calculatedTotals = {
      total_calories_kcal: breakfast.calories_kcal + lunch.calories_kcal + snacks.calories_kcal + dinner.calories_kcal,
      total_protein_g: breakfast.protein_g + lunch.protein_g + snacks.protein_g + dinner.protein_g,
      total_carbs_g: breakfast.carbs_g + lunch.carbs_g + snacks.carbs_g + dinner.carbs_g,
      total_fat_g: breakfast.fat_g + lunch.fat_g + snacks.fat_g + dinner.fat_g
    };
    
    return {
      isValid: Math.abs(calculatedTotals.total_calories_kcal - this.summary.total_calories_kcal) < 1,
      calculatedTotals,
      storedTotals: this.summary
    };
  } else {
    // Multi-day validation
    let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
    
    for (let day = 1; day <= this.dayCount; day++) {
      const dayKey = `day${day}`;
      const dayMeals = this.dailyMeals.get(dayKey);
      if (dayMeals) {
        totalCalories += dayMeals.breakfast.calories_kcal + dayMeals.lunch.calories_kcal + 
                       dayMeals.snacks.calories_kcal + dayMeals.dinner.calories_kcal;
        totalProtein += dayMeals.breakfast.protein_g + dayMeals.lunch.protein_g + 
                       dayMeals.snacks.protein_g + dayMeals.dinner.protein_g;
        totalCarbs += dayMeals.breakfast.carbs_g + dayMeals.lunch.carbs_g + 
                     dayMeals.snacks.carbs_g + dayMeals.dinner.carbs_g;
        totalFat += dayMeals.breakfast.fat_g + dayMeals.lunch.fat_g + 
                   dayMeals.snacks.fat_g + dayMeals.dinner.fat_g;
      }
    }
    
    const calculatedTotals = {
      total_calories_kcal: totalCalories,
      total_protein_g: totalProtein,
      total_carbs_g: totalCarbs,
      total_fat_g: totalFat
    };
    
    return {
      isValid: Math.abs(calculatedTotals.total_calories_kcal - this.summary.total_calories_kcal) < 5,
      calculatedTotals,
      storedTotals: this.summary
    };
  }
};

module.exports = mongoose.model('MealPlan', mealPlanSchema);