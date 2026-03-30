import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useAppStore from '../stores/useAppStore';
import api from '../services/api';
import useDocumentTitle from '../hooks/useDocumentTitle';

const PatientProfile = () => {
  useDocumentTitle('Patient Profile');
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [allergyInput, setAllergyInput] = useState('');
  const [dislikedInput, setDislikedInput] = useState('');

  // Zustand store
  const {
    currentPatient,
    loading,
    errors,
    messages,
    fetchPatient,
    updatePatient,
    setMessage,
    clearMessage,
  } = useAppStore();

  const [profile, setProfile] = useState({
    age: '',
    height_cm: '',
    weight_kg: '',
    bloodPressure: '',
    bloodGroup: '',
    medicalSummary: '',
    diseaseCondition: '',
    mealPreference: '',
    allergies: [],
    dislikedItems: [],
    activityLevel: '',
    healthGoal: '',
    location: {
      country: '',
      state: '',
      city: '',
    },
  });

  // ── Static dropdown options ──────────────────────────────────────
  const mealPreferences = useMemo(() => ['Vegetarian', 'Non-Vegetarian', 'Mixed'], []);
  const activityLevels = useMemo(
    () => ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active'],
    []
  );
  const healthGoals = useMemo(
    () => ['Weight Loss', 'Weight Maintenance', 'Muscle Gain', 'Manage Condition'],
    []
  );

  // Covers ICMR keyword categories in geminiClient.js
  const diseaseConditions = useMemo(
    () => [
      'None / General Health',
      'Type 2 Diabetes',
      'Type 1 Diabetes',
      'Gestational Diabetes',
      'Hypertension (High Blood Pressure)',
      'Cardiovascular Disease',
      'High Cholesterol',
      'Chronic Kidney Disease (CKD)',
      'Liver Disease / Fatty Liver (NAFLD)',
      'Anaemia / Iron Deficiency',
      'Hypothyroidism',
      'Hyperthyroidism',
      'Obesity / Overweight',
      'Gout / High Uric Acid',
      'Polycystic Ovary Syndrome (PCOS)',
      'Asthma',
      'Arthritis',
      'Osteoporosis',
      'Gastritis / Acid Reflux (GERD)',
      'Irritable Bowel Syndrome (IBS)',
      'Cancer (under treatment)',
      'Other',
    ],
    []
  );

  // All Indian states and UTs — match keys in regionalCuisineMap (geminiClient.js)
  const indianStates = useMemo(
    () => [
      // States
      'Andhra Pradesh',
      'Arunachal Pradesh',
      'Assam',
      'Bihar',
      'Chhattisgarh',
      'Goa',
      'Gujarat',
      'Haryana',
      'Himachal Pradesh',
      'Jharkhand',
      'Karnataka',
      'Kerala',
      'Madhya Pradesh',
      'Maharashtra',
      'Manipur',
      'Meghalaya',
      'Mizoram',
      'Nagaland',
      'Odisha',
      'Punjab',
      'Rajasthan',
      'Sikkim',
      'Tamil Nadu',
      'Telangana',
      'Tripura',
      'Uttar Pradesh',
      'Uttarakhand',
      'West Bengal',
      // Union Territories
      'Andaman and Nicobar Islands',
      'Chandigarh',
      'Dadra and Nagar Haveli and Daman and Diu',
      'Delhi',
      'Jammu and Kashmir',
      'Ladakh',
      'Lakshadweep',
      'Puducherry',
    ],
    []
  );

  // ── Load patient data ─────────────────────────────────────────────
  useEffect(() => {
    if (user?.id) fetchPatient(user.id);
  }, [user?.id, fetchPatient]);

  useEffect(() => {
    if (currentPatient?.profile) {
      setProfile({
        age: currentPatient.profile.age || '',
        height_cm: currentPatient.profile.height_cm || '',
        weight_kg: currentPatient.profile.weight_kg || '',
        bloodPressure: currentPatient.profile.bloodPressure || '',
        bloodGroup: currentPatient.profile.bloodGroup || '',
        medicalSummary: currentPatient.profile.medicalSummary || '',
        diseaseCondition: currentPatient.profile.diseaseCondition || '',
        mealPreference: currentPatient.profile.mealPreference || '',
        allergies: currentPatient.profile.allergies || [],
        dislikedItems: currentPatient.profile.dislikedItems || [],
        activityLevel: currentPatient.profile.activityLevel || '',
        healthGoal: currentPatient.profile.healthGoal || '',
        location: {
          country: currentPatient.profile.location?.country || '',
          state: currentPatient.profile.location?.state || '',
          city: currentPatient.profile.location?.city || '',
        },
      });
    }
  }, [currentPatient]);

  // Auto-clear success message after 5 s
  useEffect(() => {
    if (messages.success) {
      const t = setTimeout(() => clearMessage('success'), 5000);
      return () => clearTimeout(t);
    }
  }, [messages.success, clearMessage]);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setProfile((prev) => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value },
      }));
    } else {
      setProfile((prev) => ({ ...prev, [name]: value }));
    }
  };

  const addAllergy = () => {
    const val = allergyInput.trim();
    if (val && !profile.allergies.includes(val)) {
      setProfile((prev) => ({ ...prev, allergies: [...prev.allergies, val] }));
      setAllergyInput('');
    }
  };

  const removeAllergy = (a) =>
    setProfile((prev) => ({ ...prev, allergies: prev.allergies.filter((x) => x !== a) }));

  const addDislikedItem = () => {
    const val = dislikedInput.trim();
    if (val && !profile.dislikedItems.includes(val)) {
      setProfile((prev) => ({ ...prev, dislikedItems: [...prev.dislikedItems, val] }));
      setDislikedInput('');
    }
  };

  const removeDislikedItem = (item) =>
    setProfile((prev) => ({
      ...prev,
      dislikedItems: prev.dislikedItems.filter((x) => x !== item),
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Blood pressure format validation (e.g. 120/80)
    if (profile.bloodPressure && !/^\d{2,3}\/\d{2,3}$/.test(profile.bloodPressure.trim())) {
      setMessage('error', 'Blood Pressure must be in the format 120/80');
      return;
    }

    try {
      setSaving(true);
      clearMessage('success');
      const response = await api.put('/api/patients/profile', { profile });
      updatePatient(user.id, { profile: response.data.profile });
      setMessage('success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // ── Shared style ─────────────────────────────────────────────────
  const inputCls =
    'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (loading.patients) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Patient Profile</h2>

        {/* Alerts */}
        {messages.success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {messages.success}
          </div>
        )}
        {(errors.patients || messages.error) && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {errors.patients || messages.error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* ── SECTION: Basic Information ───────────────────── */}
          <fieldset>
            <legend className="w-full text-base font-semibold text-gray-800 border-b pb-1 mb-4">
              Basic Information
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Age */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="age"
                  value={profile.age}
                  onChange={handleInputChange}
                  min={1}
                  max={120}
                  placeholder="e.g., 35"
                  className={inputCls}
                  required
                />
              </div>

              {/* Height */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height (cm) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="height_cm"
                  value={profile.height_cm}
                  onChange={handleInputChange}
                  min={50}
                  max={250}
                  placeholder="e.g., 165"
                  className={inputCls}
                  required
                />
              </div>

              {/* Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (kg) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="weight_kg"
                  value={profile.weight_kg}
                  onChange={handleInputChange}
                  min={10}
                  max={300}
                  step="0.1"
                  placeholder="e.g., 70"
                  className={inputCls}
                  required
                />
              </div>

              {/* Blood Group */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Blood Group <span className="text-red-500">*</span>
                </label>
                <select
                  name="bloodGroup"
                  value={profile.bloodGroup}
                  onChange={handleInputChange}
                  className={inputCls}
                  required
                >
                  <option value="">Select Blood Group</option>
                  {['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'].map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Blood Pressure */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Blood Pressure{' '}
                  <span className="text-xs text-gray-400 font-normal">(format: 120/80)</span>
                </label>
                <input
                  type="text"
                  name="bloodPressure"
                  value={profile.bloodPressure}
                  onChange={handleInputChange}
                  placeholder="e.g., 120/80"
                  pattern="^\d{2,3}\/\d{2,3}$"
                  title="Enter blood pressure as systolic/diastolic — e.g. 120/80"
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-gray-400">Leave blank if unknown.</p>
              </div>
            </div>
          </fieldset>

          {/* ── SECTION: Location ────────────────────────────── */}
          <fieldset>
            <legend className="w-full text-base font-semibold text-gray-800 border-b pb-1 mb-1">
              Location{' '}
              <span className="text-xs font-normal text-gray-400">
                — used to tailor regional Indian foods in your meal plan
              </span>
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="location.country"
                  value={profile.location.country}
                  onChange={handleInputChange}
                  placeholder="e.g., India"
                  className={inputCls}
                  required
                />
              </div>

              {/* State — full Indian state + UT dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State / UT <span className="text-red-500">*</span>
                </label>
                <select
                  name="location.state"
                  value={profile.location.state}
                  onChange={handleInputChange}
                  className={inputCls}
                  required
                >
                  <option value="">Select State / UT</option>
                  {indianStates.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="Other">Other (outside India)</option>
                </select>
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="location.city"
                  value={profile.location.city}
                  onChange={handleInputChange}
                  placeholder="e.g., Chennai"
                  className={inputCls}
                  required
                />
              </div>
            </div>
          </fieldset>

          {/* ── SECTION: Health Information ──────────────────── */}
          <fieldset>
            <legend className="w-full text-base font-semibold text-gray-800 border-b pb-1 mb-4">
              Health Information
            </legend>
            <div className="space-y-4">

              {/* Disease Condition */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disease / Condition <span className="text-red-500">*</span>
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
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  The meal plan follows ICMR-NIN 2024 dietary guidelines for the selected condition.
                </p>
              </div>

              {/* Medical Summary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medical Summary
                </label>
                <textarea
                  name="medicalSummary"
                  value={profile.medicalSummary}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Any additional medical history, medications, or notes for the dietitian..."
                  className={inputCls}
                />
              </div>
            </div>
          </fieldset>

          {/* ── SECTION: Dietary Preferences ─────────────────── */}
          <fieldset>
            <legend className="w-full text-base font-semibold text-gray-800 border-b pb-1 mb-4">
              Dietary Preferences
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Meal Preference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meal Preference <span className="text-red-500">*</span>
                </label>
                <select
                  name="mealPreference"
                  value={profile.mealPreference}
                  onChange={handleInputChange}
                  className={inputCls}
                  required
                >
                  <option value="">Select Preference</option>
                  {mealPreferences.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Activity Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activity Level <span className="text-red-500">*</span>
                </label>
                <select
                  name="activityLevel"
                  value={profile.activityLevel}
                  onChange={handleInputChange}
                  className={inputCls}
                  required
                >
                  <option value="">Select Activity Level</option>
                  {activityLevels.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              {/* Health Goal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Health Goal <span className="text-red-500">*</span>
                </label>
                <select
                  name="healthGoal"
                  value={profile.healthGoal}
                  onChange={handleInputChange}
                  className={inputCls}
                  required
                >
                  <option value="">Select Health Goal</option>
                  {healthGoals.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {/* ── SECTION: Allergies ────────────────────────────── */}
          <fieldset>
            <legend className="w-full text-base font-semibold text-gray-800 border-b pb-1 mb-4">
              Allergies
            </legend>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={allergyInput}
                onChange={(e) => setAllergyInput(e.target.value)}
                placeholder="Type an allergy and press Add or Enter…"
                className={`flex-1 ${inputCls}`}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
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
                <span
                  key={i}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800"
                >
                  {allergy}
                  <button
                    type="button"
                    onClick={() => removeAllergy(allergy)}
                    className="ml-2 text-red-600 hover:text-red-800 font-bold leading-none"
                    title={`Remove ${allergy}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </fieldset>

          {/* ── SECTION: Disliked Food Items ──────────────────── */}
          <fieldset>
            <legend className="w-full text-base font-semibold text-gray-800 border-b pb-1 mb-4">
              Disliked Food Items
            </legend>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={dislikedInput}
                onChange={(e) => setDislikedInput(e.target.value)}
                placeholder="Type a food you dislike and press Add or Enter…"
                className={`flex-1 ${inputCls}`}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDislikedItem())}
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
                <span
                  key={i}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => removeDislikedItem(item)}
                    className="ml-2 text-yellow-600 hover:text-yellow-800 font-bold leading-none"
                    title={`Remove ${item}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </fieldset>

          {/* ── Submit ────────────────────────────────────────── */}
          <div className="flex justify-end pt-2">
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
                'Save Profile'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientProfile;