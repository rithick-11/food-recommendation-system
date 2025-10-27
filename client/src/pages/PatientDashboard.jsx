import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";
import useAppStore from "../stores/useAppStore";
import api from "../services/api";

const PatientDashboard = () => {
  const { user } = useAuth();
  const [mealPlan, setMealPlan] = useState(null);

  // Zustand store
  const {
    currentPatient: profile,
    loading,
    errors,
    fetchMyProfile,
  } = useAppStore();

  useEffect(() => {
    if (user?.id) {
      fetchMyProfile(user.id);
      
      // Fetch meal plan separately (not in store)
      api.get("/api/mealplan/me")
        .then(response => {
          setMealPlan(response.data.data.mealPlan);
        })
        .catch(error => {
          console.log("No meal plan found:", error);
        });
    }
  }, [user?.id]);

  const profileStatus = useMemo(() => {
    if (!profile) return { completed: false, percentage: 0 };

    const requiredFields = [
      "age",
      "height_cm",
      "weight_kg",
      "diseaseCondition",
      "mealPreference",
      "activityLevel",
      "healthGoal",
    ];
    const completedFields = requiredFields.filter((field) => profile[field]);
    const percentage = Math.round(
      (completedFields.length / requiredFields.length) * 100
    );

    return {
      completed: percentage === 100,
      percentage,
      missing: requiredFields.filter((field) => !profile[field]),
    };
  }, [profile]);

  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  if (loading.profile) {
    return (
      <div className="max-w-6xl mx-auto">
        <LoadingSpinner size="lg" text="Loading your dashboard..." />
      </div>
    );
  }



  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600">
          Manage your health profile and get personalized meal recommendations
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <span className="text-2xl">👤</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Profile Status
              </p>
              <div className="flex items-center">
                <p className="text-2xl font-semibold text-gray-900 mr-2">
                  {profileStatus.percentage}%
                </p>
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      profileStatus.percentage === 100
                        ? "bg-green-500"
                        : profileStatus.percentage >= 50
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${profileStatus.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <span className="text-2xl">🍽️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Meal Plans</p>
              <p className="text-2xl font-semibold text-gray-900">
                {mealPlan ? "1" : "0"}
              </p>
              <p className="text-xs text-gray-500">
                {mealPlan ? "Generated" : "Available"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <span className="text-2xl">🎯</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Health Goal</p>
              <p className="text-lg font-semibold text-gray-900">
                {profile?.healthGoal || "Not Set"}
              </p>
              {profile?.activityLevel && (
                <p className="text-xs text-gray-500">{profile.activityLevel}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Management */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Health Profile
            </h2>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                profileStatus.completed
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {profileStatus.completed
                ? "Complete"
                : `${profileStatus.percentage}% Complete`}
            </span>
          </div>

          {profile ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Age:</span>
                <span className="font-medium">{profile.age || "Not set"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Height:</span>
                <span className="font-medium">
                  {profile.height_cm ? `${profile.height_cm} cm` : "Not set"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Weight:</span>
                <span className="font-medium">
                  {profile.weight_kg ? `${profile.weight_kg} kg` : "Not set"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Activity Level:</span>
                <span className="font-medium">
                  {profile.activityLevel || "Not set"}
                </span>
              </div>

              {!profileStatus.completed && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    Complete your profile to get personalized meal
                    recommendations
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-4">No profile found</p>
            </div>
          )}

          <div className="mt-6">
            <Link
              to="/profile"
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              {profile ? "Update Profile" : "Create Profile"}
            </Link>
          </div>
        </div>

        {/* Meal Planning */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Meal Planning
            </h2>
            {mealPlan && (
              <span className="text-sm text-gray-500">
                Last updated: {formatDate(mealPlan.generatedAt)}
              </span>
            )}
          </div>

          {mealPlan ? (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Today's Summary
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Calories:</span>
                    <span className="font-medium">
                      {mealPlan.summary?.total_calories_kcal || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Protein:</span>
                    <span className="font-medium">
                      {mealPlan.summary?.total_protein_g || 0}g
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">
                  Quick Preview:
                </h3>
                <div className="text-sm text-gray-600">
                  <p>
                    <strong>Breakfast:</strong>{" "}
                    {mealPlan.meals?.breakfast?.items?.substring(0, 50)}...
                  </p>
                  <p>
                    <strong>Lunch:</strong>{" "}
                    {mealPlan.meals?.lunch?.items?.substring(0, 50)}...
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
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
              <p className="text-gray-600 mb-4">No meal plan generated yet</p>
              {!profileStatus.completed && (
                <p className="text-sm text-yellow-600 mb-4">
                  Complete your health profile first to generate meal plans
                </p>
              )}
            </div>
          )}

          <div className="mt-6">
            <Link
              to="/meal-plan"
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              {mealPlan ? "View Meal Plan" : "Generate Meal Plan"}
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/profile"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg
                className="h-5 w-5 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                Manage Profile
              </p>
              <p className="text-xs text-gray-600">Update health information</p>
            </div>
          </Link>

          <Link
            to="/meal-plan"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="p-2 bg-green-100 rounded-lg">
              <svg
                className="h-5 w-5 text-green-600"
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
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                View Meal Plan
              </p>
              <p className="text-xs text-gray-600">See recommendations</p>
            </div>
          </Link>

          <div className="flex items-center p-4 border border-gray-200 rounded-lg opacity-50">
            <div className="p-2 bg-gray-100 rounded-lg">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-400">
                Progress Tracking
              </p>
              <p className="text-xs text-gray-400">Coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
