import { useEffect } from 'react';
import useAppStore from '../stores/useAppStore';

/**
 * Custom hook to manage patient profile data with caching
 * @param {string} userId - The user ID to fetch profile for
 * @returns {object} Patient profile data and loading states
 */
export const useMyProfile = (userId) => {
  const {
    currentPatient,
    loading,
    errors,
    messages,
    fetchMyProfile,
    updateMyProfile,
    clearMessage,
  } = useAppStore();

  // Fetch profile data if not already cached
  useEffect(() => {
    if (userId && !currentPatient) {
      fetchMyProfile(userId);
    }
  }, [userId, currentPatient, fetchMyProfile]);

  return {
    profile: currentPatient,
    loading: loading.profile,
    error: errors.profile,
    message: messages.success,
    updateProfile: (profileData) => updateMyProfile(userId, profileData),
    clearMessage: () => clearMessage('success'),
  };
};

/**
 * Custom hook for doctor to manage patient data
 * @param {string} patientId - The patient ID to fetch data for
 * @returns {object} Patient data and loading states
 */
export const usePatientProfile = (patientId) => {
  const {
    loading,
    errors,
    fetchPatientProfile,
    getCachedData,
  } = useAppStore();

  const patient = getCachedData(`patient-${patientId}`);

  // Fetch patient data if not already cached
  useEffect(() => {
    if (patientId && !patient) {
      fetchPatientProfile(patientId);
    }
  }, [patientId, patient, fetchPatientProfile]);

  return {
    patient,
    loading: loading.patients,
    error: errors.patients,
  };
};

/**
 * Custom hook for doctor dashboard
 * @returns {object} All patients data and loading states
 */
export const useAllPatients = () => {
  const {
    loading,
    errors,
    fetchAllPatients,
    getCachedData,
  } = useAppStore();

  const patients = getCachedData('all-patients') || [];

  // Fetch patients data if not already cached
  useEffect(() => {
    if (patients.length === 0) {
      fetchAllPatients();
    }
  }, [patients.length, fetchAllPatients]);

  return {
    patients,
    loading: loading.dashboard,
    error: errors.dashboard,
    refetch: () => fetchAllPatients(true), // Force refresh
  };
};

export default useMyProfile;