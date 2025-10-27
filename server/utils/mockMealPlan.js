/**
 * Mock meal plan generator for testing and fallback purposes
 */
class MockMealPlanGenerator {
  /**
   * Generates a mock meal plan based on patient profile
   * @param {Object} patientProfile - Patient profile data
   * @param {number} dayCount - Number of days for meal plan (1-7)
   * @returns {Object} - Mock meal plan object
   */
  generateMealPlan(patientProfile, dayCount = 1) {
    const {
      age,
      weight_kg,
      activityLevel,
      mealPreference,
      diseaseCondition,
      healthGoal,
      location = {}
    } = patientProfile;

    // Calculate basic calorie needs (simplified BMR calculation)
    const baseCalories = this.calculateBaseCalories(
      age,
      weight_kg,
      activityLevel
    );

    // Adjust for health goals
    const targetCalories = this.adjustCaloriesForGoal(baseCalories, healthGoal);

    if (dayCount === 1) {
      // Single day meal plan (backward compatibility)
      const meals = this.generateMeals(
        mealPreference,
        diseaseCondition,
        targetCalories,
        location
      );

      return {
        meals,
        summary: {
          total_calories_kcal:
            meals.breakfast.calories_kcal +
            meals.lunch.calories_kcal +
            meals.snacks.calories_kcal +
            meals.dinner.calories_kcal,
          total_protein_g:
            meals.breakfast.protein_g +
            meals.lunch.protein_g +
            meals.snacks.protein_g +
            meals.dinner.protein_g,
          total_carbs_g:
            meals.breakfast.carbs_g +
            meals.lunch.carbs_g +
            meals.snacks.carbs_g +
            meals.dinner.carbs_g,
          total_fat_g:
            meals.breakfast.fat_g +
            meals.lunch.fat_g +
            meals.snacks.fat_g +
            meals.dinner.fat_g,
        },
      };
    } else {
      // Multi-day meal plan
      const dailyMeals = {};
      const dailySummaries = {};
      let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;

      for (let day = 1; day <= dayCount; day++) {
        const dayKey = `day${day}`;
        
        // Generate meals for this day with slight variations
        const dayMeals = this.generateMeals(
          mealPreference,
          diseaseCondition,
          targetCalories,
          location,
          day // Pass day number for variation
        );

        dailyMeals[dayKey] = dayMeals;

        // Calculate daily summary
        const daySummary = {
          total_calories_kcal:
            dayMeals.breakfast.calories_kcal +
            dayMeals.lunch.calories_kcal +
            dayMeals.snacks.calories_kcal +
            dayMeals.dinner.calories_kcal,
          total_protein_g:
            dayMeals.breakfast.protein_g +
            dayMeals.lunch.protein_g +
            dayMeals.snacks.protein_g +
            dayMeals.dinner.protein_g,
          total_carbs_g:
            dayMeals.breakfast.carbs_g +
            dayMeals.lunch.carbs_g +
            dayMeals.snacks.carbs_g +
            dayMeals.dinner.carbs_g,
          total_fat_g:
            dayMeals.breakfast.fat_g +
            dayMeals.lunch.fat_g +
            dayMeals.snacks.fat_g +
            dayMeals.dinner.fat_g,
        };

        dailySummaries[dayKey] = daySummary;

        // Add to overall totals
        totalCalories += daySummary.total_calories_kcal;
        totalProtein += daySummary.total_protein_g;
        totalCarbs += daySummary.total_carbs_g;
        totalFat += daySummary.total_fat_g;
      }

      return {
        dailyMeals,
        dailySummaries,
        summary: {
          total_calories_kcal: totalCalories,
          total_protein_g: totalProtein,
          total_carbs_g: totalCarbs,
          total_fat_g: totalFat,
        },
      };
    }
  }

  calculateBaseCalories(age, weight, activityLevel) {
    // Simplified BMR calculation
    let bmr = 10 * weight + 6.25 * 170 - 5 * age + 5; // Assuming average height

    const activityMultipliers = {
      Sedentary: 1.2,
      "Lightly Active": 1.375,
      "Moderately Active": 1.55,
      "Very Active": 1.725,
    };

    return Math.round(bmr * (activityMultipliers[activityLevel] || 1.375));
  }

  adjustCaloriesForGoal(baseCalories, healthGoal) {
    const adjustments = {
      "Weight Loss": -300,
      "Weight Maintenance": 0,
      "Muscle Gain": 300,
      "Manage Condition": 0,
    };

    return baseCalories + (adjustments[healthGoal] || 0);
  }

  generateMeals(mealPreference, diseaseCondition, targetCalories, location, dayNumber = 1) {
    const breakfastCalories = Math.round(targetCalories * 0.25);
    const lunchCalories = Math.round(targetCalories * 0.35);
    const snackCalories = Math.round(targetCalories * 0.15);
    const dinnerCalories = Math.round(targetCalories * 0.25);

    const meals = {
      breakfast: this.generateMeal(
        "breakfast",
        mealPreference,
        diseaseCondition,
        breakfastCalories,
        location,
        dayNumber
      ),
      lunch: this.generateMeal(
        "lunch",
        mealPreference,
        diseaseCondition,
        lunchCalories,
        location,
        dayNumber
      ),
      snacks: this.generateMeal(
        "snacks",
        mealPreference,
        diseaseCondition,
        snackCalories,
        location,
        dayNumber
      ),
      dinner: this.generateMeal(
        "dinner",
        mealPreference,
        diseaseCondition,
        dinnerCalories,
        location,
        dayNumber
      ),
    };

    return meals;
  }

  generateMeal(mealType, mealPreference, diseaseCondition, targetCalories, location = {}, dayNumber = 1) {
    // Get location-specific meal templates
    const mealTemplates = this.getLocationBasedMealTemplates(location);

    // Get variations for multi-day plans
    const mealVariations = this.getMealVariations(mealType, mealPreference, location);
    const variationIndex = (dayNumber - 1) % mealVariations.length;
    
    const baseMeal = mealVariations[variationIndex] ||
      mealTemplates[mealType][mealPreference] ||
      mealTemplates[mealType]["Mixed"];

    // Adjust for disease conditions
    let adjustedMeal = { ...baseMeal };

    if (diseaseCondition.toLowerCase().includes("diabetes")) {
      adjustedMeal.items += " (low glycemic index options)";
      adjustedMeal.carbs_g = Math.round(adjustedMeal.carbs_g * 0.8);
      adjustedMeal.fiber_g = Math.round(adjustedMeal.fiber_g * 1.2);
    }

    if (diseaseCondition.toLowerCase().includes("hypertension")) {
      adjustedMeal.items += " (low sodium preparation)";
    }

    // Scale to target calories
    const currentCalories =
      adjustedMeal.carbs_g * 4 +
      adjustedMeal.protein_g * 4 +
      adjustedMeal.fat_g * 9;
    const scaleFactor = targetCalories / currentCalories;

    return {
      items: adjustedMeal.items,
      carbs_g: Math.round(adjustedMeal.carbs_g * scaleFactor),
      protein_g: Math.round(adjustedMeal.protein_g * scaleFactor),
      fat_g: Math.round(adjustedMeal.fat_g * scaleFactor),
      fiber_g: Math.round(adjustedMeal.fiber_g * scaleFactor),
      calories_kcal: targetCalories,
    };
  }

  getMealVariations(mealType, mealPreference, location) {
    // Simple variations for multi-day plans
    const baseTemplates = this.getLocationBasedMealTemplates(location);
    const baseMeal = baseTemplates[mealType][mealPreference] || baseTemplates[mealType]["Mixed"];
    
    // Create 3 variations of each meal for variety
    const variations = [
      baseMeal, // Original
      { ...baseMeal, items: baseMeal.items.replace(/1 cup/g, '1.5 cups').replace(/2 /g, '1 ') }, // Variation 1
      { ...baseMeal, items: baseMeal.items + ' with herbs and spices' } // Variation 2
    ];
    
    return variations;
  }

  getLocationBasedMealTemplates(location) {
    const country = location.country?.toLowerCase() || '';
    const state = location.state?.toLowerCase() || '';
    
    // Indian cuisine templates
    if (country.includes('india') || state.includes('maharashtra') || state.includes('gujarat') || state.includes('punjab')) {
      return {
        breakfast: {
          Vegetarian: {
            items: "2 whole wheat parathas with 1 cup curd, 1 tbsp pickle, 1 glass buttermilk",
            carbs_g: 60, protein_g: 18, fat_g: 15, fiber_g: 8
          },
          'Non-Vegetarian': {
            items: "2 egg parathas with mint chutney, 1 cup masala chai, 1 banana",
            carbs_g: 55, protein_g: 22, fat_g: 18, fiber_g: 6
          },
          Mixed: {
            items: "1 bowl upma with vegetables, 1 cup sambar, 1 coconut chutney",
            carbs_g: 50, protein_g: 15, fat_g: 12, fiber_g: 7
          }
        },
        lunch: {
          Vegetarian: {
            items: "2 rotis, 1 cup dal, mixed vegetable curry, rice, pickle, curd",
            carbs_g: 75, protein_g: 20, fat_g: 18, fiber_g: 12
          },
          'Non-Vegetarian': {
            items: "2 rotis, chicken curry, jeera rice, mixed vegetables, raita",
            carbs_g: 70, protein_g: 35, fat_g: 20, fiber_g: 8
          },
          Mixed: {
            items: "Vegetable biryani with raita, boiled egg, papad, pickle",
            carbs_g: 80, protein_g: 25, fat_g: 15, fiber_g: 10
          }
        },
        snacks: {
          Vegetarian: {
            items: "1 cup masala chai with 2 whole wheat biscuits, handful of nuts",
            carbs_g: 25, protein_g: 8, fat_g: 16, fiber_g: 4
          },
          'Non-Vegetarian': {
            items: "Chicken tikka (3 pieces) with mint chutney, 1 cup green tea",
            carbs_g: 15, protein_g: 20, fat_g: 12, fiber_g: 2
          },
          Mixed: {
            items: "1 bowl sprouts chaat with chutneys, 1 glass fresh lime water",
            carbs_g: 30, protein_g: 12, fat_g: 8, fiber_g: 6
          }
        },
        dinner: {
          Vegetarian: {
            items: "2 rotis, palak paneer, dal, rice, cucumber salad",
            carbs_g: 65, protein_g: 22, fat_g: 18, fiber_g: 12
          },
          'Non-Vegetarian': {
            items: "2 rotis, fish curry, rice, mixed vegetables, onion salad",
            carbs_g: 60, protein_g: 30, fat_g: 20, fiber_g: 8
          },
          Mixed: {
            items: "Khichdi with ghee, curd, pickle, roasted papad",
            carbs_g: 55, protein_g: 18, fat_g: 15, fiber_g: 8
          }
        }
      };
    }
    
    // Mediterranean cuisine templates
    if (country.includes('italy') || country.includes('greece') || country.includes('spain')) {
      return {
        breakfast: {
          Vegetarian: {
            items: "Greek yogurt with honey, walnuts, fresh figs, whole grain toast",
            carbs_g: 45, protein_g: 20, fat_g: 18, fiber_g: 8
          },
          'Non-Vegetarian': {
            items: "Mediterranean omelet with feta, tomatoes, olives, whole grain bread",
            carbs_g: 35, protein_g: 25, fat_g: 22, fiber_g: 6
          },
          Mixed: {
            items: "Avocado toast with tomatoes, olive oil, balsamic, fresh herbs",
            carbs_g: 40, protein_g: 12, fat_g: 20, fiber_g: 10
          }
        },
        lunch: {
          Vegetarian: {
            items: "Greek salad with chickpeas, whole wheat pita, hummus, olive tapenade",
            carbs_g: 60, protein_g: 18, fat_g: 25, fiber_g: 12
          },
          'Non-Vegetarian': {
            items: "Grilled fish with quinoa, roasted vegetables, tzatziki sauce",
            carbs_g: 45, protein_g: 35, fat_g: 18, fiber_g: 8
          },
          Mixed: {
            items: "Mediterranean bowl with falafel, tabbouleh, hummus, pita",
            carbs_g: 65, protein_g: 20, fat_g: 22, fiber_g: 10
          }
        },
        snacks: {
          Vegetarian: {
            items: "Mixed olives, feta cheese, whole grain crackers, herbal tea",
            carbs_g: 20, protein_g: 8, fat_g: 15, fiber_g: 4
          },
          'Non-Vegetarian': {
            items: "Prosciutto with melon, handful of almonds, sparkling water",
            carbs_g: 15, protein_g: 12, fat_g: 10, fiber_g: 3
          },
          Mixed: {
            items: "Hummus with vegetable sticks, whole grain pita, green tea",
            carbs_g: 25, protein_g: 8, fat_g: 12, fiber_g: 6
          }
        },
        dinner: {
          Vegetarian: {
            items: "Ratatouille with quinoa, fresh herbs, olive oil, mixed greens",
            carbs_g: 50, protein_g: 15, fat_g: 18, fiber_g: 12
          },
          'Non-Vegetarian': {
            items: "Grilled chicken with Mediterranean vegetables, brown rice, olive oil",
            carbs_g: 45, protein_g: 35, fat_g: 20, fiber_g: 8
          },
          Mixed: {
            items: "Seafood paella with vegetables, saffron, olive oil, lemon",
            carbs_g: 55, protein_g: 28, fat_g: 15, fiber_g: 6
          }
        }
      };
    }
    
    // Default international templates (used for other locations)
    return {
      breakfast: {
        Vegetarian: {
          items: "1 cup oatmeal with banana, walnuts, low-fat milk, honey",
          carbs_g: 65, protein_g: 15, fat_g: 12, fiber_g: 8
        },
        'Non-Vegetarian': {
          items: "2 scrambled eggs, whole wheat toast, fresh berries, low-fat yogurt",
          carbs_g: 45, protein_g: 25, fat_g: 15, fiber_g: 6
        },
        Mixed: {
          items: "Greek yogurt with granola, sliced apple, almond butter",
          carbs_g: 55, protein_g: 20, fat_g: 18, fiber_g: 7
        }
      },
      lunch: {
        Vegetarian: {
          items: "Mixed salad with chickpeas, quinoa, vegetables, olive oil dressing, whole wheat pita",
          carbs_g: 75, protein_g: 20, fat_g: 18, fiber_g: 12
        },
        'Non-Vegetarian': {
          items: "Grilled chicken breast, brown rice, steamed broccoli, mixed vegetables",
          carbs_g: 65, protein_g: 35, fat_g: 12, fiber_g: 8
        },
        Mixed: {
          items: "Turkey and avocado wrap with whole wheat tortilla, side salad with vinaigrette",
          carbs_g: 55, protein_g: 28, fat_g: 16, fiber_g: 9
        }
      },
      snacks: {
        Vegetarian: {
          items: "Apple with peanut butter, herbal tea",
          carbs_g: 25, protein_g: 8, fat_g: 16, fiber_g: 5
        },
        'Non-Vegetarian': {
          items: "Hard-boiled egg, whole grain toast, vegetable juice",
          carbs_g: 20, protein_g: 10, fat_g: 8, fiber_g: 3
        },
        Mixed: {
          items: "Mixed nuts and dried fruits, string cheese",
          carbs_g: 22, protein_g: 9, fat_g: 14, fiber_g: 4
        }
      },
      dinner: {
        Vegetarian: {
          items: "Lentil curry, brown rice, sautéed spinach, whole grain bread",
          carbs_g: 70, protein_g: 22, fat_g: 15, fiber_g: 14
        },
        'Non-Vegetarian': {
          items: "Baked salmon, roasted sweet potato, steamed asparagus, mixed green salad",
          carbs_g: 45, protein_g: 40, fat_g: 20, fiber_g: 8
        },
        Mixed: {
          items: "Lean beef stir-fry with vegetables, quinoa, steamed edamame",
          carbs_g: 55, protein_g: 35, fat_g: 18, fiber_g: 10
        }
      }
    };
  }
}

module.exports = MockMealPlanGenerator;
