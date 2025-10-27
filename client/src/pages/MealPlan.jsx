import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import MealCard from "../components/MealCard";

const MealPlan = () => {
  const { user } = useAuth();
  const [mealPlan, setMealPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  // Ref to prevent duplicate API calls
  const hasFetchedMealPlan = useRef(false);

  const fetchMealPlan = async () => {
    // Prevent duplicate API calls
    if (hasFetchedMealPlan.current || loading) {
      return;
    }
    try {
      setLoading(true);
      setError("");
      hasFetchedMealPlan.current = true;

      const response = await api.get("/api/mealplan/me");
      setMealPlan(response.data.data.mealPlan);
    } catch (error) {
      console.error("Error fetching meal plan:", error);
      hasFetchedMealPlan.current = false; // Allow retry on error

      if (error.response?.status === 404) {
        setError("No meal plan found. Generate your first meal plan below!");
      } else {
        setError(error.response?.data?.message || "Failed to fetch meal plan");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMealPlan();

    // Cleanup function
    return () => {
      hasFetchedMealPlan.current = false;
    };
  }, []);

  const generateMealPlan = useCallback(async () => {
    try {
      setGenerating(true);
      setError("");
      setMessage("");

      const response = await api.post("/api/mealplan/generate");

      setMealPlan(response.data.data.mealPlan);
      setMessage("New meal plan generated successfully!");
    } catch (error) {
      console.error("Error generating meal plan:", error);
      setError(error.response?.data?.message || "Failed to generate meal plan");
    } finally {
      setGenerating(false);
    }
  }, []);

  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Meal Plan</h1>
        <button
          onClick={generateMealPlan}
          disabled={generating}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Generating...
            </>
          ) : (
            "Generate New Meal Plan"
          )}
        </button>
      </div>

      {message && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {mealPlan ? (
        <div className="space-y-6">
          {/* Meal Plan Header */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Daily Meal Plan
              </h2>
              <span className="text-sm text-gray-500">
                Generated on {formatDate(mealPlan.generatedAt)}
              </span>
            </div>

            {/* Daily Summary */}
            {mealPlan.summary && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Daily Nutritional Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {mealPlan.summary.total_calories_kcal}
                    </div>
                    <div className="text-sm text-gray-600">Total Calories</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {mealPlan.summary.total_protein_g}g
                    </div>
                    <div className="text-sm text-gray-600">Protein</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {mealPlan.summary.total_carbs_g}g
                    </div>
                    <div className="text-sm text-gray-600">Carbohydrates</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {mealPlan.summary.total_fat_g}g
                    </div>
                    <div className="text-sm text-gray-600">Fat</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Individual Meals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MealCard
              mealType="breakfast"
              mealData={mealPlan.meals?.breakfast}
            />
            <MealCard mealType="lunch" mealData={mealPlan.meals?.lunch} />
            <MealCard mealType="snacks" mealData={mealPlan.meals?.snacks} />
            <MealCard mealType="dinner" mealData={mealPlan.meals?.dinner} />
          </div>
        </div>
      ) : (
        !error && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Meal Plan Yet
            </h3>
            <p className="text-gray-600 mb-4">
              Generate your first personalized meal plan based on your health
              profile.
            </p>
            <button
              onClick={generateMealPlan}
              disabled={generating}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? "Generating..." : "Generate Meal Plan"}
            </button>
          </div>
        )
      )}
    </div>
  );
};

export default MealPlan;
