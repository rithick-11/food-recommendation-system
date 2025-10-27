import React from 'react';
import { usePatientData } from '../hooks/usePatientData';

/**
 * Simple component that demonstrates using the Zustand store
 * Shows patient basic info and meal plan status
 */
const PatientSummary = ({ patientId }) => {
  const { patient, mealPlan, loading, errors } = usePatientData(patientId);

  if (loading.patient) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (errors.patient) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {errors.patient}
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded">
        Patient not found
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{patient.name}</h3>
          <p className="text-sm text-gray-600">{patient.email}</p>
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            patient.profile ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {patient.profile ? 'Profile Complete' : 'Profile Incomplete'}
          </span>
        </div>
      </div>

      {patient.profile && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Age:</span>
            <span className="ml-2 font-medium">{patient.profile.age}</span>
          </div>
          <div>
            <span className="text-gray-500">BMI:</span>
            <span className="ml-2 font-medium">
              {patient.profile.height_cm && patient.profile.weight_kg
                ? Math.round((patient.profile.weight_kg / Math.pow(patient.profile.height_cm / 100, 2)) * 10) / 10
                : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Goal:</span>
            <span className="ml-2 font-medium">{patient.profile.healthGoal || 'Not set'}</span>
          </div>
          <div>
            <span className="text-gray-500">Meal Plan:</span>
            <span className={`ml-2 font-medium ${mealPlan ? 'text-green-600' : 'text-gray-400'}`}>
              {mealPlan ? 'Available' : 'Not generated'}
            </span>
          </div>
        </div>
      )}

      {mealPlan && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Last meal plan: {new Date(mealPlan.generatedAt).toLocaleDateString()}
          </div>
          {mealPlan.summary && (
            <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
              <div className="text-center">
                <div className="font-semibold text-blue-600">{mealPlan.summary.total_calories_kcal}</div>
                <div className="text-gray-500">Calories</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-green-600">{mealPlan.summary.total_protein_g}g</div>
                <div className="text-gray-500">Protein</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-yellow-600">{mealPlan.summary.total_carbs_g}g</div>
                <div className="text-gray-500">Carbs</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-red-600">{mealPlan.summary.total_fat_g}g</div>
                <div className="text-gray-500">Fat</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PatientSummary;