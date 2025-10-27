import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useAppStore from '../stores/useAppStore';
import api from '../services/api';

const PatientProfile = () => {
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
      city: ''
    }
  });

  // Memoize static arrays to prevent unnecessary re-renders
  const mealPreferences = useMemo(() => ['Vegetarian', 'Non-Vegetarian', 'Mixed'], []);
  const activityLevels = useMemo(() => ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active'], []);
  const healthGoals = useMemo(() => ['Weight Loss', 'Weight Maintenance', 'Muscle Gain', 'Manage Condition'], []);

  // Load patient data on mount
  useEffect(() => {
    if (user?.id) {
      fetchPatient(user.id);
    }
  }, [user?.id, fetchPatient]);

  // Update local profile state when patient data changes
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
          city: currentPatient.profile.location?.city || ''
        }
      });
    }
  }, [currentPatient]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (messages.success) {
      const timer = setTimeout(() => clearMessage('success'), 5000);
      return () => clearTimeout(timer);
    }
  }, [messages.success, clearMessage]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setProfile(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setProfile(prev => ({ ...prev, [name]: value }));
    }
  };

  const addAllergy = () => {
    if (allergyInput.trim() && !profile.allergies.includes(allergyInput.trim())) {
      setProfile(prev => ({
        ...prev,
        allergies: [...prev.allergies, allergyInput.trim()]
      }));
      setAllergyInput('');
    }
  };

  const removeAllergy = (allergy) => {
    setProfile(prev => ({
      ...prev,
      allergies: prev.allergies.filter(a => a !== allergy)
    }));
  };

  const addDislikedItem = () => {
    if (dislikedInput.trim() && !profile.dislikedItems.includes(dislikedInput.trim())) {
      setProfile(prev => ({
        ...prev,
        dislikedItems: [...prev.dislikedItems, dislikedInput.trim()]
      }));
      setDislikedInput('');
    }
  };

  const removeDislikedItem = (item) => {
    setProfile(prev => ({
      ...prev,
      dislikedItems: prev.dislikedItems.filter(i => i !== item)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      clearMessage('success');

      const response = await api.put('/api/patients/profile', { profile });
      
      // Update the store with new profile data
      updatePatient(user.id, { profile: response.data.profile });
      
      setMessage('success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading.patients) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Patient Profile</h2>
        
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age
              </label>
              <input
                type="number"
                name="age"
                value={profile.age}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Height (cm)
              </label>
              <input
                type="number"
                name="height_cm"
                value={profile.height_cm}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weight (kg)
              </label>
              <input
                type="number"
                name="weight_kg"
                value={profile.weight_kg}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blood Group
              </label>
              <select
                name="bloodGroup"
                value={profile.bloodGroup}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <input
                type="text"
                name="location.country"
                value={profile.location.country}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <input
                type="text"
                name="location.state"
                value={profile.location.state}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                name="location.city"
                value={profile.location.city}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Health Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blood Pressure
              </label>
              <input
                type="text"
                name="bloodPressure"
                value={profile.bloodPressure}
                onChange={handleInputChange}
                placeholder="e.g., 120/80"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief medical history..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Disease Condition
              </label>
              <input
                type="text"
                name="diseaseCondition"
                value={profile.diseaseCondition}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Diabetes, Hypertension"
              />
            </div>
          </div>

          {/* Preferences */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meal Preference
              </label>
              <select
                name="mealPreference"
                value={profile.mealPreference}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Preference</option>
                {mealPreferences.map(pref => (
                  <option key={pref} value={pref}>{pref}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Activity Level
              </label>
              <select
                name="activityLevel"
                value={profile.activityLevel}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Activity Level</option>
                {activityLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Health Goal
              </label>
              <select
                name="healthGoal"
                value={profile.healthGoal}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Health Goal</option>
                {healthGoals.map(goal => (
                  <option key={goal} value={goal}>{goal}</option>
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
                placeholder="Add allergy..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
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
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800"
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
              Disliked Food Items
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={dislikedInput}
                onChange={(e) => setDislikedInput(e.target.value)}
                placeholder="Add disliked item..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDislikedItem())}
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
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800"
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

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
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