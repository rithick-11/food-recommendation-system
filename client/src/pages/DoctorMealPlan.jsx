import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useAppStore from "../stores/useAppStore";
import MealCard from "../components/MealCard";
import MultiDayMealPlan from "../components/MultiDayMealPlan";
import api from "../services/api";

const DoctorMealPlan = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  
  // Local state for UI
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryPlan, setSelectedHistoryPlan] = useState(null);
  const [currentHistoryPage, setCurrentHistoryPage] = useState(1);
  const [historyData, setHistoryData] = useState({ mealPlans: [], pagination: {} });

  // Zustand store
  const {
    loading,
    errors,
    messages,
    fetchPatientProfile,
    getCachedData,
    setLoading,
    setError,
    setMessage,
    clearMessage,
  } = useAppStore();

  // Local state for meal plan functionality
  const [mealPlan, setMealPlan] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [dayCount, setDayCount] = useState(1);

  // Get patient from cache
  const patient = getCachedData(`patient-${patientId}`);

  // Load patient and meal plan data
  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchPatientProfile(patientId);
        await fetchMealPlan();
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    if (patientId) {
      loadData();
    }
  }, [patientId]); // Remove fetchPatientProfile from dependencies

  // Fetch meal plan function
  const fetchMealPlan = async () => {
    try {
      setLoading('patients', true);
      const response = await api.get(`/api/mealplan/${patientId}`);
      setMealPlan(response.data.mealPlan);
    } catch (error) {
      if (error.response?.status === 404) {
        setError('patients', 'No meal plan found for this patient. Generate the first meal plan below!');
      } else {
        setError('patients', error.response?.data?.message || 'Failed to fetch meal plan');
      }
    } finally {
      setLoading('patients', false);
    }
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (messages.success) {
      const timer = setTimeout(() => clearMessage('success'), 5000);
      return () => clearTimeout(timer);
    }
  }, [messages.success, clearMessage]);

  const handleBackToProfile = () => {
    navigate(`/doctor/patient/${patientId}`);
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleHistory = async () => {
    if (!showHistory) {
      try {
        const data = await fetchMealPlanHistory(patientId, 1);
        setHistoryData(data);
        setCurrentHistoryPage(1);
      } catch (error) {
        console.error('Error fetching history:', error);
      }
    }
    setShowHistory(!showHistory);
  };

  const viewHistoryPlan = (plan) => {
    setSelectedHistoryPlan(plan);
  };

  const backToCurrentPlan = () => {
    setSelectedHistoryPlan(null);
  };

  const regenerateMealPlan = async () => {
    if (window.confirm(`Are you sure you want to generate a new ${dayCount}-day meal plan? This will create a new plan based on the current patient profile.`)) {
      try {
        setGenerating(true);
        clearMessage('success');
        
        const response = await api.post(`/api/mealplan/generate/${patientId}`, {
          dayCount: dayCount
        });
        setMealPlan(response.data.mealPlan);
        setMessage('success', `New ${dayCount}-day meal plan generated successfully for the patient!`);
        
        if (showHistory) {
          await fetchMealPlanHistory(1);
        }
      } catch (error) {
        console.error('Error generating meal plan:', error);
        setError('patients', error.response?.data?.message || 'Failed to generate meal plan');
      } finally {
        setGenerating(false);
      }
    }
  };

  const fetchMealPlanHistory = async (page) => {
    try {
      setLoading('patients', true);
      const response = await api.get(`/api/mealplan/${patientId}/history?page=${page}&limit=5`);
      setHistoryData(response.data);
      setCurrentHistoryPage(page);
    } catch (error) {
      console.error('Error fetching meal plan history:', error);
      setError('patients', 'Failed to fetch meal plan history');
    } finally {
      setLoading('patients', false);
    }
  };

  const handleHistoryPageChange = async (page) => {
    await fetchMealPlanHistory(page);
  };

  if (loading.patients) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errors.patients || "Patient not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Patient Meal Plan
          </h1>
          <p className="text-gray-600 mt-1">
            Managing meal plan for {patient.user?.name || patient.name} ({patient.user?.email || patient.email})
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleBackToProfile}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back to Profile
          </button>
          <button
            onClick={handleBackToDashboard}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Dashboard
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label htmlFor="doctorDayCount" className="text-sm font-medium text-gray-700">
              Days:
            </label>
            <select
              id="doctorDayCount"
              value={dayCount}
              onChange={(e) => setDayCount(parseInt(e.target.value))}
              disabled={generating}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {[1, 2, 3, 4, 5, 6, 7].map(day => (
                <option key={day} value={day}>
                  {day} {day === 1 ? 'day' : 'days'}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={regenerateMealPlan}
            disabled={generating || !patient}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {mealPlan ? "Regenerate Meal Plan" : "Generate New Meal Plan"}
              </>
            )}
          </button>
          
          {mealPlan && (
            <>
              <button
                onClick={toggleHistory}
                className="px-4 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {showHistory ? "Hide History" : "View History"}
              </button>
              
              {selectedHistoryPlan && (
                <button
                  onClick={backToCurrentPlan}
                  className="px-4 py-2 text-green-600 border border-green-300 rounded-md hover:bg-green-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Back to Current Plan
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {!patient && (
        <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Patient profile is incomplete. Please complete the profile before
            generating a meal plan.
          </div>
        </div>
      )}

      {messages.success && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {messages.success}
        </div>
      )}

      {errors.patients && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {errors.patients}
        </div>
      )}

      {loading.patients ? (
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Current Meal Plan */}
          {mealPlan ? (
            <div className="space-y-6">
              {/* Historical View Indicator */}
              {selectedHistoryPlan && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      Historical View
                    </span>
                    <span className="text-sm text-yellow-700">
                      You are viewing a historical meal plan from {formatDate(mealPlan.generatedAt)}
                    </span>
                  </div>
                </div>
              )}

              {/* Multi-day or Single-day Display */}
              {mealPlan.dayCount > 1 ? (
                <MultiDayMealPlan mealPlan={mealPlan} />
              ) : (
                <div className="space-y-6">
                  {/* Meal Plan Header */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {selectedHistoryPlan ? "Historical Meal Plan" : "Current Meal Plan"}
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
                            <div className="text-sm text-gray-600">
                              Total Calories
                            </div>
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
                            <div className="text-sm text-gray-600">
                              Carbohydrates
                            </div>
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
              )}

              {/* Meal Plan History */}
              {showHistory && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Meal Plan History ({historyData.pagination.totalCount || 0} total)
                    </h3>
                    {loading.patients && (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    )}
                  </div>
                  
                  {historyData.mealPlans.length > 0 ? (
                    <>
                      <div className="space-y-3">
                        {historyData.mealPlans.map((plan, index) => (
                          <div
                            key={plan.id}
                            className={`border rounded-lg p-4 transition-colors cursor-pointer hover:bg-gray-50 ${
                              selectedHistoryPlan?.id === plan.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            }`}
                            onClick={() => viewHistoryPlan(plan)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  Plan #{((currentHistoryPage - 1) * 5) + index + 1}
                                </span>
                                {plan.dayCount > 1 && (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                    {plan.dayCount} Days
                                  </span>
                                )}
                                {selectedHistoryPlan?.id === plan.id && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                    Currently Viewing
                                  </span>
                                )}
                              </div>
                              <span className="text-sm text-gray-500">
                                {formatDate(plan.generatedAt)}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                              <div className="text-gray-600">
                                <span className="font-medium text-blue-600">
                                  {plan.summary?.total_calories_kcal || 0}
                                </span> cal
                              </div>
                              <div className="text-gray-600">
                                <span className="font-medium text-green-600">
                                  {plan.summary?.total_protein_g || 0}g
                                </span> protein
                              </div>
                              <div className="text-gray-600">
                                <span className="font-medium text-yellow-600">
                                  {plan.summary?.total_carbs_g || 0}g
                                </span> carbs
                              </div>
                              <div className="text-gray-600">
                                <span className="font-medium text-red-600">
                                  {plan.summary?.total_fat_g || 0}g
                                </span> fat
                              </div>
                            </div>
                            
                            <div className="mt-2 text-xs text-gray-500">
                              {plan.daysAgo === 0 ? 'Today' : 
                               plan.daysAgo === 1 ? '1 day ago' : 
                               `${plan.daysAgo} days ago`}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Pagination */}
                      {historyData.pagination.totalPages > 1 && (
                        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                          <div className="text-sm text-gray-600">
                            Page {currentHistoryPage} of {historyData.pagination.totalPages}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleHistoryPageChange(currentHistoryPage - 1)}
                              disabled={!historyData.pagination.hasPrevPage || loading.patients}
                              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() => handleHistoryPageChange(currentHistoryPage + 1)}
                              disabled={!historyData.pagination.hasNextPage || loading.patients}
                              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-gray-500">
                        No meal plan history available for this patient.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            !errors.patients && (
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
                  Generate the first personalized meal plan for this patient
                  based on their health profile.
                </p>
                <div className="flex items-center gap-4 justify-center">
                  <div className="flex items-center gap-2">
                    <label htmlFor="doctorDayCountEmpty" className="text-sm font-medium text-gray-700">
                      Days:
                    </label>
                    <select
                      id="doctorDayCountEmpty"
                      value={dayCount}
                      onChange={(e) => setDayCount(parseInt(e.target.value))}
                      disabled={generating}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map(day => (
                        <option key={day} value={day}>
                          {day} {day === 1 ? 'day' : 'days'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={regenerateMealPlan}
                    disabled={generating || !patient}
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {generating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Generate Meal Plan
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
};

export default DoctorMealPlan;
