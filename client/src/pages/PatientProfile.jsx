import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import useAppStore from "../stores/useAppStore";
import useDocumentTitle from '../hooks/useDocumentTitle';

const PatientProfile = () => {
  useDocumentTitle('Patient Profile');
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

  // ── Static dropdown options ───────────────────────────────────────
  const mealPreferences = useMemo(() => ["Vegetarian", "Non-Vegetarian", "Mixed"], []);
  const activityLevels  = useMemo(() => ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"], []);
  const healthGoals     = useMemo(() => ["Weight Loss", "Weight Maintenance", "Muscle Gain", "Manage Condition"], []);

  // 22 common Indian disease conditions — match ICMR keywords in geminiClient.js
  const diseaseConditions = useMemo(() => [
    "None / General Health",
    "Type 2 Diabetes",
    "Type 1 Diabetes",
    "Gestational Diabetes",
    "Hypertension (High Blood Pressure)",
    "Cardiovascular Disease",
    "High Cholesterol",
    "Chronic Kidney Disease (CKD)",
    "Liver Disease / Fatty Liver (NAFLD)",
    "Anaemia / Iron Deficiency",
    "Hypothyroidism",
    "Hyperthyroidism",
    "Obesity / Overweight",
    "Gout / High Uric Acid",
    "Polycystic Ovary Syndrome (PCOS)",
    "Asthma",
    "Arthritis",
    "Osteoporosis",
    "Gastritis / Acid Reflux (GERD)",
    "Irritable Bowel Syndrome (IBS)",
    "Cancer (under treatment)",
    "Other",
  ], []);

  // All 28 states + 8 UTs — match regionalCuisineMap keys in geminiClient.js
  const indianStates = useMemo(() => [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal",
    // Union Territories
    "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
    "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
  ], []);

  // ── Load patient data on mount ────────────────────────────────────
  useEffect(() => {
    if (user?.id) {
      fetchMyProfile(user.id);
    }
  }, [user?.id]); // eslint-disable-line

  // Sync store data → local form state
  useEffect(() => {
    if (currentPatient?.age) {
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
  }, [currentPatient]);

  // Auto-clear success message after 5 s
  useEffect(() => {
    if (messages.success) {
      const t = setTimeout(() => clearMessage("success"), 5000);
      return () => clearTimeout(t);
    }
  }, [messages.success, clearMessage]);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    if (name.startsWith("location.")) {
      const field = name.split(".")[1];
      setProfile((prev) => ({ ...prev, location: { ...prev.location, [field]: value } }));
    } else {
      setProfile((prev) => ({ ...prev, [name]: value }));
    }
  }, []);

  const addAllergy = useCallback(() => {
    const val = allergyInput.trim();
    if (val && !profile.allergies.includes(val)) {
      setProfile((prev) => ({ ...prev, allergies: [...prev.allergies, val] }));
      setAllergyInput("");
    }
  }, [allergyInput, profile.allergies]);

  const removeAllergy = useCallback((a) => {
    setProfile((prev) => ({ ...prev, allergies: prev.allergies.filter((x) => x !== a) }));
  }, []);

  const addDislikedItem = useCallback(() => {
    const val = dislikedInput.trim();
    if (val && !profile.dislikedItems.includes(val)) {
      setProfile((prev) => ({ ...prev, dislikedItems: [...prev.dislikedItems, val] }));
      setDislikedInput("");
    }
  }, [dislikedInput, profile.dislikedItems]);

  const removeDislikedItem = useCallback((item) => {
    setProfile((prev) => ({ ...prev, dislikedItems: prev.dislikedItems.filter((x) => x !== item) }));
  }, []);

  const validateForm = useCallback(() => {
    const required = ["age", "height_cm", "weight_kg", "diseaseCondition", "mealPreference", "activityLevel", "healthGoal"];
    for (const field of required) {
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
    // Blood pressure format validation (e.g. 120/80)
    if (profile.bloodPressure && !/^\d{2,3}\/\d{2,3}$/.test(profile.bloodPressure.trim())) {
      setMessage("error", "Blood Pressure must be in the format 120/80");
      return false;
    }
    return true;
  }, [profile, setMessage]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    clearMessage("success");
    if (!validateForm()) return;
    try {
      setSaving(true);
      await updateMyProfile(user.id, profile);
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setSaving(false);
    }
  }, [profile, validateForm, user?.id, updateMyProfile, clearMessage]);

  // ── Shared style ─────────────────────────────────────────────────
  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";

  if (loading.profile) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Health Profile</h1>

        {/* Alerts */}
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

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* ── SECTION: Basic Information ──────────────────── */}
          <fieldset>
            <legend className="w-full text-base font-semibold text-gray-800 border-b pb-1 mb-4">
              Basic Information
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Age */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Age *</label>
                <input
                  type="number"
                  name="age"
                  value={profile.age || ""}
                  onChange={handleInputChange}
                  className={inputCls}
                  required
                  min="1"
                  max="120"
                  placeholder="e.g., 35"
                />
              </div>

              {/* Height */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm) *</label>
                <input
                  type="number"
                  name="height_cm"
                  value={profile.height_cm || ""}
                  onChange={handleInputChange}
                  className={inputCls}
                  required
                  min="50"
                  max="300"
                  placeholder="e.g., 165"
                />
              </div>

              {/* Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg) *</label>
                <input
                  type="number"
                  name="weight_kg"
                  value={profile.weight_kg || ""}
                  onChange={handleInputChange}
                  className={inputCls}
                  required
                  min="10"
                  max="500"
                  step="0.1"
                  placeholder="e.g., 70"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Blood Pressure */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Blood Pressure
                  <span className="ml-1 text-xs text-gray-400 font-normal">(format: 120/80)</span>
                </label>
                <input
                  type="text"
                  name="bloodPressure"
                  value={profile.bloodPressure || ""}
                  onChange={handleInputChange}
                  placeholder="e.g., 120/80"
                  pattern="^\d{2,3}\/\d{2,3}$"
                  title="Enter as systolic/diastolic, e.g. 120/80"
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-gray-400">Leave blank if unknown.</p>
              </div>

              {/* Blood Group — dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
                <select
                  name="bloodGroup"
                  value={profile.bloodGroup}
                  onChange={handleInputChange}
                  className={inputCls}
                >
                  <option value="">Select Blood Group</option>
                  {["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"].map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {/* ── SECTION: Health Information ─────────────────── */}
          <fieldset>
            <legend className="w-full text-base font-semibold text-gray-800 border-b pb-1 mb-4">
              Health Information
            </legend>
            <div className="space-y-4">
              {/* Disease Condition — dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Disease Condition *
                </label>
                <select
                  name="diseaseCondition"
                  value={profile.diseaseCondition}
                  onChange={handleInputChange}
                  className={inputCls}
                  required
                >
                  <option value="">Select Condition</option>
                  {diseaseConditions.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  Your meal plan will follow ICMR-NIN 2024 dietary guidelines for the selected condition.
                </p>
              </div>

              {/* Medical Summary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Medical Summary</label>
                <textarea
                  name="medicalSummary"
                  value={profile.medicalSummary}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Brief summary of your medical history, medications, or notes..."
                  className={inputCls}
                />
              </div>
            </div>
          </fieldset>

          {/* ── SECTION: Dietary Preferences ────────────────── */}
          <fieldset>
            <legend className="w-full text-base font-semibold text-gray-800 border-b pb-1 mb-4">
              Dietary Preferences
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Meal Preference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meal Preference *</label>
                <select
                  name="mealPreference"
                  value={profile.mealPreference}
                  onChange={handleInputChange}
                  className={inputCls}
                  required
                >
                  <option value="">Select preference</option>
                  {mealPreferences.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Activity Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Activity Level *</label>
                <select
                  name="activityLevel"
                  value={profile.activityLevel}
                  onChange={handleInputChange}
                  className={inputCls}
                  required
                >
                  <option value="">Select level</option>
                  {activityLevels.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              {/* Health Goal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Health Goal *</label>
                <select
                  name="healthGoal"
                  value={profile.healthGoal}
                  onChange={handleInputChange}
                  className={inputCls}
                  required
                >
                  <option value="">Select goal</option>
                  {healthGoals.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {/* ── SECTION: Allergies ───────────────────────────── */}
          <fieldset>
            <legend className="w-full text-base font-semibold text-gray-800 border-b pb-1 mb-4">
              Allergies
            </legend>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={allergyInput}
                onChange={(e) => setAllergyInput(e.target.value)}
                placeholder="Type an allergy and press Add or Enter…"
                className={`flex-1 ${inputCls}`}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAllergy())}
              />
              <button
                type="button"
                onClick={addAllergy}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
            {profile.allergies.length === 0 && (
              <p className="text-xs text-gray-400 mb-2">No allergies added.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {profile.allergies.map((allergy, i) => (
                <span key={i} className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                  {allergy}
                  <button
                    type="button"
                    onClick={() => removeAllergy(allergy)}
                    className="ml-2 text-red-600 hover:text-red-800 font-bold"
                    title={`Remove ${allergy}`}
                  >×</button>
                </span>
              ))}
            </div>
          </fieldset>

          {/* ── SECTION: Disliked Foods ──────────────────────── */}
          <fieldset>
            <legend className="w-full text-base font-semibold text-gray-800 border-b pb-1 mb-4">
              Disliked Foods
            </legend>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={dislikedInput}
                onChange={(e) => setDislikedInput(e.target.value)}
                placeholder="Type a food you dislike and press Add or Enter…"
                className={`flex-1 ${inputCls}`}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDislikedItem())}
              />
              <button
                type="button"
                onClick={addDislikedItem}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
            {profile.dislikedItems.length === 0 && (
              <p className="text-xs text-gray-400 mb-2">No disliked items added.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {profile.dislikedItems.map((item, i) => (
                <span key={i} className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                  {item}
                  <button
                    type="button"
                    onClick={() => removeDislikedItem(item)}
                    className="ml-2 text-yellow-600 hover:text-yellow-800 font-bold"
                    title={`Remove ${item}`}
                  >×</button>
                </span>
              ))}
            </div>
          </fieldset>

          {/* ── SECTION: Location ────────────────────────────── */}
          <fieldset>
            <legend className="w-full text-base font-semibold text-gray-800 border-b pb-1 mb-1">
              📍 Location Information
            </legend>
            <p className="text-sm text-gray-500 mb-4">
              Used to recommend regional Indian cuisines and locally available ingredients.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <input
                  type="text"
                  name="location.country"
                  value={profile.location?.country || ""}
                  onChange={handleInputChange}
                  placeholder="e.g., India"
                  className={inputCls}
                />
              </div>

              {/* State — full Indian state + UT dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State / UT</label>
                <select
                  name="location.state"
                  value={profile.location?.state || ""}
                  onChange={handleInputChange}
                  className={inputCls}
                >
                  <option value="">Select State / UT</option>
                  {indianStates.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="Other">Other (outside India)</option>
                </select>
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  name="location.city"
                  value={profile.location?.city || ""}
                  onChange={handleInputChange}
                  placeholder="e.g., Mumbai, Chennai"
                  className={inputCls}
                />
              </div>
            </div>
          </fieldset>

          {/* ── Submit ─────────────────────────────────────── */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Saving…
                </>
              ) : (
                "Save Profile"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientProfile;
