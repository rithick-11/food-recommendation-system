import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import useAppStore from "../stores/useAppStore";

const PatientProfile = () => {
  const { user } = useAuth();

  // Zustand store
  const {
    currentPatient,
    loading,
    errors,
    messages,
    fetchMyProfile,
    updateMyProfile,
    setMessage,
    clearMessage,
  } = useAppStore();

  const [saving, setSaving] = useState(false);
  const [allergyInput, setAllergyInput] = useState("");
  const [dislikedInput, setDislikedInput] = useState("");

  // Local profile state
  const [profile, setProfile] = useState({
    age: "",
    height_cm: "",
    weight_kg: "",
    bloodPressure: "",
    bloodGroup: "",
    medicalSummary: "",
    diseaseCondition: "",
    mealPreference: "",
    allergies: [],
    dislikedItems: [],
    activityLevel: "",
    healthGoal: "",
    location: {
      country: "",
      state: "",
      city: "",
    },
  });

  // Memoize static arrays to prevent unnecessary re-renders
  const mealPreferences = useMemo(
    () => ["Vegetarian", "Non-Vegetarian", "Mixed"],
    []
  );
  const activityLevels = useMemo(
    () => ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"],
    []
  );
  const healthGoals = useMemo(
    () => [
      "Weight Loss",
      "Weight Maintenance",
      "Muscle Gain",
      "Manage Condition",
    ],
    []
  );

  // Load patient data on mount
  useEffect(() => {
    if (user?.id) {
      fetchMyProfile(user.id);
    }
  }, [user?.id]); // Remove fetchMyProfile from dependencies

  // Update local profile state when patient data changes
  useEffect(() => {
    if (currentPatient) {
      // The profile controller returns the profile data directly
      // Check if currentPatient has profile data (not null/empty)
      if (currentPatient.age) {
        setProfile({
          age: currentPatient.age || "",
          height_cm: currentPatient.height_cm || "",
          weight_kg: currentPatient.weight_kg || "",
          bloodPressure: currentPatient.bloodPressure || "",
          bloodGroup: currentPatient.bloodGroup || "",
          medicalSummary: currentPatient.medicalSummary || "",
          diseaseCondition: currentPatient.diseaseCondition || "",
          mealPreference: currentPatient.mealPreference || "",
          allergies: currentPatient.allergies || [],
          dislikedItems: currentPatient.dislikedItems || [],
          activityLevel: currentPatient.activityLevel || "",
          healthGoal: currentPatient.healthGoal || "",
          location: {
            country: currentPatient.location?.country || "",
            state: currentPatient.location?.state || "",
            city: currentPatient.location?.city || "",
          },
        });
      }
      // If no profile data, keep the empty form (default state)
    }
  }, [currentPatient]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (messages.success) {
      const timer = setTimeout(() => clearMessage("success"), 5000);
      return () => clearTimeout(timer);
    }
  }, [messages.success, clearMessage]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;

    // Handle nested location fields
    if (name.startsWith("location.")) {
      const locationField = name.split(".")[1];
      setProfile((prev) => ({
        ...prev,
        location: {
          ...prev.location,
          [locationField]: value,
        },
      }));
    } else {
      setProfile((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  }, []);

  const addAllergy = useCallback(() => {
    if (
      allergyInput.trim() &&
      !profile.allergies.includes(allergyInput.trim())
    ) {
      setProfile((prev) => ({
        ...prev,
        allergies: [...prev.allergies, allergyInput.trim()],
      }));
      setAllergyInput("");
    }
  }, [allergyInput, profile.allergies]);

  const removeAllergy = useCallback((allergy) => {
    setProfile((prev) => ({
      ...prev,
      allergies: prev.allergies.filter((a) => a !== allergy),
    }));
  }, []);

  const addDislikedItem = useCallback(() => {
    if (
      dislikedInput.trim() &&
      !profile.dislikedItems.includes(dislikedInput.trim())
    ) {
      setProfile((prev) => ({
        ...prev,
        dislikedItems: [...prev.dislikedItems, dislikedInput.trim()],
      }));
      setDislikedInput("");
    }
  }, [dislikedInput, profile.dislikedItems]);

  const removeDislikedItem = useCallback((item) => {
    setProfile((prev) => ({
      ...prev,
      dislikedItems: prev.dislikedItems.filter((i) => i !== item),
    }));
  }, []);

  const validateForm = useCallback(() => {
    const requiredFields = [
      "age",
      "height_cm",
      "weight_kg",
      "diseaseCondition",
      "mealPreference",
      "activityLevel",
      "healthGoal",
    ];

    for (const field of requiredFields) {
      if (!profile[field]) {
        setMessage("error", `${field.replace("_", " ")} is required`);
        return false;
      }
    }

    if (profile.age < 1 || profile.age > 120) {
      setMessage("error", "Age must be between 1 and 120");
      return false;
    }

    if (profile.height_cm < 50 || profile.height_cm > 300) {
      setMessage("error", "Height must be between 50 and 300 cm");
      return false;
    }

    if (profile.weight_kg < 10 || profile.weight_kg > 500) {
      setMessage("error", "Weight must be between 10 and 500 kg");
      return false;
    }

    return true;
  }, [profile, setMessage]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      clearMessage("success");

      if (!validateForm()) {
        return;
      }

      try {
        setSaving(true);
        await updateMyProfile(user.id, profile);
      } catch (error) {
        console.error("Error saving profile:", error);
      } finally {
        setSaving(false);
      }
    },
    [profile, validateForm, user?.id, updateMyProfile]
  );

  if (loading.profile) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* <ProfileDebug /> */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Health Profile
        </h1>

        {messages.success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {messages.success}
          </div>
        )}

        {(messages.error || errors.profile) && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {messages.error || errors.profile}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age *
              </label>
              <input
                type="number"
                name="age"
                value={profile?.age || ""}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                min="1"
                max="120"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Height (cm) *
              </label>
              <input
                type="number"
                name="height_cm"
                value={profile?.height_cm || ""}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                min="50"
                max="300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weight (kg) *
              </label>
              <input
                type="number"
                name="weight_kg"
                value={profile?.weight_kg || ""}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                min="10"
                max="500"
              />
            </div>
          </div>

          {/* Medical Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blood Pressure
              </label>
              <input
                type="text"
                name="bloodPressure"
                value={profile?.bloodPressure || ""}
                onChange={handleInputChange}
                placeholder="e.g., 120/80"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blood Group
              </label>
              <input
                type="text"
                name="bloodGroup"
                value={profile.bloodGroup}
                onChange={handleInputChange}
                placeholder="e.g., A+, B-, O+"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Disease Condition *
            </label>
            <input
              type="text"
              name="diseaseCondition"
              value={profile.diseaseCondition}
              onChange={handleInputChange}
              placeholder="e.g., Diabetes, Hypertension, None"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Medical Summary
            </label>
            <textarea
              name="medicalSummary"
              value={profile.medicalSummary}
              onChange={handleInputChange}
              rows="3"
              placeholder="Brief summary of your medical history..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Dietary Preferences */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meal Preference *
              </label>
              <select
                name="mealPreference"
                value={profile.mealPreference}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select preference</option>
                {mealPreferences.map((pref) => (
                  <option key={pref} value={pref}>
                    {pref}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Activity Level *
              </label>
              <select
                name="activityLevel"
                value={profile.activityLevel}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select level</option>
                {activityLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Health Goal *
              </label>
              <select
                name="healthGoal"
                value={profile.healthGoal}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select goal</option>
                {healthGoals.map((goal) => (
                  <option key={goal} value={goal}>
                    {goal}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Allergies */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Allergies
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={allergyInput}
                onChange={(e) => setAllergyInput(e.target.value)}
                placeholder="Add an allergy"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addAllergy())
                }
              />
              <button
                type="button"
                onClick={addAllergy}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.allergies.map((allergy, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                >
                  {allergy}
                  <button
                    type="button"
                    onClick={() => removeAllergy(allergy)}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Disliked Items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Disliked Foods
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={dislikedInput}
                onChange={(e) => setDislikedInput(e.target.value)}
                placeholder="Add a disliked food"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addDislikedItem())
                }
              />
              <button
                type="button"
                onClick={addDislikedItem}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.dislikedItems.map((item, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => removeDislikedItem(item)}
                    className="ml-2 text-yellow-600 hover:text-yellow-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Location Information */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📍 Location Information
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Help us recommend regional cuisines and locally available
              ingredients
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  name="location.country"
                  value={profile.location?.country || ""}
                  onChange={handleInputChange}
                  placeholder="e.g., India, USA, UK"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Province
                </label>
                <input
                  type="text"
                  name="location.state"
                  value={profile.location?.state || ""}
                  onChange={handleInputChange}
                  placeholder="e.g., California, Maharashtra"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="location.city"
                  value={profile.location?.city || ""}
                  onChange={handleInputChange}
                  placeholder="e.g., Mumbai, New York"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientProfile;
