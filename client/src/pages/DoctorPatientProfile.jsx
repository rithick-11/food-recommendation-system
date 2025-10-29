import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const DoctorPatientProfile = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [patient, setPatient] = useState(null);
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
    healthGoal: ''
  });
  const [originalProfile, setOriginalProfile] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [allergyInput, setAllergyInput] = useState('');
  const [dislikedInput, setDislikedInput] = useState('');

  const mealPreferences = ['Vegetarian', 'Non-Vegetarian', 'Mixed'];
  const activityLevels = ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active'];
  const healthGoals = ['Weight Loss', 'Weight Maintenance', 'Muscle Gain', 'Manage Condition'];

  useEffect(() => {
    if (patientId) {
      fetchPatientProfile();
    }
  }, [patientId]);

  useEffect(() => {
    // Check if there are changes
    if (originalProfile) {
      const hasProfileChanges = JSON.stringify(profile) !== JSON.stringify(originalProfile);
      setHasChanges(hasProfileChanges);
    }
  }, [profile, originalProfile]);

  const fetchPatientProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/patients/profile/${patientId}`);
      const patientData = response.data.data.patient;
      setPatient(patientData);
      
      if (patientData.profile) {
        setProfile(patientData.profile);
        setOriginalProfile(patientData.profile);
      } else {
        // Initialize empty profile for new patient
        const emptyProfile = {
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
          healthGoal: ''
        };
        setProfile(emptyProfile);
        setOriginalProfile(emptyProfile);
      }
    } catch (error) {
      console.error('Error fetching patient profile:', error);
      setError(error.response?.data?.message || 'Failed to fetch patient profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
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

  const validateForm = () => {
    const requiredFields = ['age', 'height_cm', 'weight_kg', 'diseaseCondition', 'mealPreference', 'activityLevel', 'healthGoal'];
    
    for (const field of requiredFields) {
      if (!profile[field]) {
        setError(`${field.replace('_', ' ')} is required`);
        return false;
      }
    }

    if (profile.age < 1 || profile.age > 120) {
      setError('Age must be between 1 and 120');
      return false;
    }

    if (profile.height_cm < 50 || profile.height_cm > 300) {
      setError('Height must be between 50 and 300 cm');
      return false;
    }

    if (profile.weight_kg < 10 || profile.weight_kg > 500) {
      setError('Weight must be between 10 and 500 kg');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      const response = await api.put(`/api/patients/profile/${patientId}`, profile);
      setMessage('Patient profile updated successfully!');
      setProfile(response.data.data.profile);
      setOriginalProfile(response.data.data.profile);
      setHasChanges(false);
    } catch (error) {
      console.error('Error updating patient profile:', error);
      setError(error.response?.data?.message || 'Failed to update patient profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        setProfile(originalProfile);
        setHasChanges(false);
      }
    } else {
      navigate('/dashboard');
    }
  };

  const handleGenerateMealPlan = () => {
    navigate(`/doctor/patient/${patientId}/meal-plan`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Patient not found
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Patient Profile</h1>
            <p className="text-gray-600 mt-1">
              Managing profile for {patient.name} ({patient.email})
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back to Dashboard
            </button>
            {patient.profile && (
              <button
                onClick={handleGenerateMealPlan}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Generate Meal Plan
              </button>
            )}
          </div>
        </div>

        {/* Change indicator */}
        {hasChanges && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              You have unsaved changes
            </div>
          </div>
        )}
        
        {message && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {message}
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
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
                value={profile.age}
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
                value={profile.height_cm}
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
                value={profile.weight_kg}
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
                value={profile.bloodPressure}
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
              placeholder="Brief summary of patient's medical history..."
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
                {mealPreferences.map(pref => (
                  <option key={pref} value={pref}>{pref}</option>
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
                {activityLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
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
                placeholder="Add an allergy"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
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
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDislikedItem())}
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

          <div className="flex justify-between">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-3 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !hasChanges}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DoctorPatientProfile;