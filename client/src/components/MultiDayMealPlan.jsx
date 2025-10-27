import { useState } from "react";
import MealCard from "./MealCard";

const MultiDayMealPlan = ({ mealPlan }) => {
  const [selectedDay, setSelectedDay] = useState(1);

  if (!mealPlan || !mealPlan.dailyMeals || !mealPlan.dayCount) {
    return null;
  }

  const { dayCount, dailyMeals, dailySummaries, summary } = mealPlan;
  const currentDayKey = `day${selectedDay}`;
  const currentDayMeals = dailyMeals[currentDayKey];
  const currentDaySummary = dailySummaries[currentDayKey];

  const formatDate = (dateString, dayOffset) => {
    const baseDate = new Date(dateString);
    const targetDate = new Date(baseDate);
    targetDate.setDate(baseDate.getDate() + dayOffset);
    
    return targetDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Multi-day Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {dayCount}-Day Meal Plan
          </h2>
          <span className="text-sm text-gray-500">
            Generated on {new Date(mealPlan.generatedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Day Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedDay === day
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Day {day}
              <span className="block text-xs opacity-75">
                {formatDate(mealPlan.generatedAt, day - 1)}
              </span>
            </button>
          ))}
        </div>

        {/* Overall Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Overall {dayCount}-Day Nutritional Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {summary.total_calories_kcal}
              </div>
              <div className="text-sm text-gray-600">Total Calories</div>
              <div className="text-xs text-gray-500">
                ~{Math.round(summary.total_calories_kcal / dayCount)}/day
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {summary.total_protein_g}g
              </div>
              <div className="text-sm text-gray-600">Total Protein</div>
              <div className="text-xs text-gray-500">
                ~{Math.round(summary.total_protein_g / dayCount)}g/day
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {summary.total_carbs_g}g
              </div>
              <div className="text-sm text-gray-600">Total Carbohydrates</div>
              <div className="text-xs text-gray-500">
                ~{Math.round(summary.total_carbs_g / dayCount)}g/day
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {summary.total_fat_g}g
              </div>
              <div className="text-sm text-gray-600">Total Fat</div>
              <div className="text-xs text-gray-500">
                ~{Math.round(summary.total_fat_g / dayCount)}g/day
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Day Display */}
      {currentDayMeals && currentDaySummary && (
        <div className="space-y-6">
          {/* Daily Summary */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Day {selectedDay} Nutritional Summary
            </h3>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600">
                    {currentDaySummary.total_calories_kcal}
                  </div>
                  <div className="text-sm text-gray-600">Calories</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">
                    {currentDaySummary.total_protein_g}g
                  </div>
                  <div className="text-sm text-gray-600">Protein</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-yellow-600">
                    {currentDaySummary.total_carbs_g}g
                  </div>
                  <div className="text-sm text-gray-600">Carbohydrates</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-red-600">
                    {currentDaySummary.total_fat_g}g
                  </div>
                  <div className="text-sm text-gray-600">Fat</div>
                </div>
              </div>
            </div>
          </div>

          {/* Individual Meals for Selected Day */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MealCard
              mealType="breakfast"
              mealData={currentDayMeals.breakfast}
              dayNumber={selectedDay}
            />
            <MealCard
              mealType="lunch"
              mealData={currentDayMeals.lunch}
              dayNumber={selectedDay}
            />
            <MealCard
              mealType="snacks"
              mealData={currentDayMeals.snacks}
              dayNumber={selectedDay}
            />
            <MealCard
              mealType="dinner"
              mealData={currentDayMeals.dinner}
              dayNumber={selectedDay}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiDayMealPlan;