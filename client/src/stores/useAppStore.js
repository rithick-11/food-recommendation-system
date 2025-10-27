import { create } from 'zustand';
import api from '../services/api';

const useAppStore = create((set, get) => ({
  // Cache for all API data
  cache: new Map(),
  
  // Track ongoing requests to prevent duplicates
  ongoingRequests: new Set(),
  
  // Current user data
  currentUser: null,
  currentPatient: null,
  
  // Loading states
  loading: {
    profile: false,
    patients: false,
    dashboard: false,
  },
  
  // Error states
  errors: {
    profile: null,
    patients: null,
    dashboard: null,
  },
  
  // Messages
  messages: {
    success: null,
    error: null,
  },

  // Generic cache management
  getCachedData: (key) => get().cache.get(key),
  
  setCachedData: (key, data) =>
    set((state) => ({
      cache: new Map(state.cache.set(key, data)),
    })),

  clearCache: (key) =>
    set((state) => {
      const newCache = new Map(state.cache);
      if (key) {
        newCache.delete(key);
      } else {
        newCache.clear();
      }
      return { cache: newCache };
    }),

  // Loading management
  setLoading: (key, value) =>
    set((state) => ({
      loading: { ...state.loading, [key]: value },
    })),

  // Error management
  setError: (key, value) =>
    set((state) => ({
      errors: { ...state.errors, [key]: value },
    })),

  clearError: (key) =>
    set((state) => ({
      errors: { ...state.errors, [key]: null },
    })),

  // Message management
  setMessage: (type, message) =>
    set((state) => ({
      messages: { ...state.messages, [type]: message },
    })),

  clearMessage: (type) =>
    set((state) => ({
      messages: { ...state.messages, [type]: null },
    })),



  // Profile actions
  fetchMyProfile: async (userId, forceRefresh = false) => {
    const state = get();
    const cacheKey = `profile-${userId}`;
    
    // Return cached data if available and not forcing refresh
    if (!forceRefresh && state.cache.has(cacheKey)) {
      const cached = state.cache.get(cacheKey);
      set({ currentPatient: cached });
      return cached;
    }
    
    // Prevent duplicate requests
    if (state.ongoingRequests.has(cacheKey)) {
      return;
    }
    
    try {
      // Mark request as ongoing
      set((state) => ({
        ongoingRequests: new Set(state.ongoingRequests.add(cacheKey))
      }));
      
      state.setLoading('profile', true);
      state.clearError('profile');
      
      const response = await api.get('/api/profile/me');
      const result = response.data.data;
      
      // Cache the result
      state.setCachedData(cacheKey, result);
      set({ currentPatient: result });
      
      return result;
    } catch (error) {
      // Handle 404 - no profile exists yet
      if (error.response?.status === 404) {
        const emptyProfile = { id: userId, profile: null };
        set({ currentPatient: emptyProfile });
        state.setCachedData(cacheKey, emptyProfile);
        return emptyProfile;
      }
      
      console.error('Error fetching profile:', error);
      const errorMessage = error.response?.data?.message || 'Failed to fetch profile information';
      state.setError('profile', errorMessage);
      throw error;
    } finally {
      // Remove from ongoing requests
      set((state) => {
        const newOngoing = new Set(state.ongoingRequests);
        newOngoing.delete(cacheKey);
        return { ongoingRequests: newOngoing };
      });
      state.setLoading('profile', false);
    }
  },

  updateMyProfile: async (userId, profileData) => {
    try {
      // get().setLoading('profile', true);
      get().clearError('profile');
      
      const response = await api.post('/api/profile/me', profileData);
      const updatedProfile = response.data.data;
      
      // Update cache and current patient
      const cacheKey = `profile-${userId}`;
      get().setCachedData(cacheKey, updatedProfile);
      set({ currentPatient: updatedProfile });
      
      get().setMessage('success', 'Profile updated successfully!');
      return updatedProfile;
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update profile';
      get().setError('profile', errorMessage);
      throw error;
    } finally {
      // get().setLoading('profile', false);
    }
  },

  // Doctor - fetch patient profile
  fetchPatientProfile: async (patientId, forceRefresh = false) => {
    const state = get();
    const cacheKey = `patient-${patientId}`;
    
    // Return cached data if available and not forcing refresh
    if (!forceRefresh && state.cache.has(cacheKey)) {
      return state.cache.get(cacheKey);
    }
    
    try {
      state.setLoading('patients', true);
      state.clearError('patients');
      
      const response = await api.get(`/api/patients/profile/${patientId}`);
      const result = response.data.data;
      
      // Cache the result
      state.setCachedData(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Error fetching patient profile:', error);
      const errorMessage = error.response?.data?.message || 'Failed to fetch patient profile';
      state.setError('patients', errorMessage);
      throw error;
    } finally {
      state.setLoading('patients', false);
    }
  },

  // Doctor - fetch all patients
  fetchAllPatients: async (forceRefresh = false) => {
    const state = get();
    const cacheKey = 'all-patients';
    
    // Return cached data if available and not forcing refresh
    if (!forceRefresh && state.cache.has(cacheKey)) {
      return state.cache.get(cacheKey);
    }
    
    // Prevent duplicate requests
    if (state.ongoingRequests.has(cacheKey)) {
      return;
    }
    
    try {
      // Mark request as ongoing
      set((state) => ({
        ongoingRequests: new Set(state.ongoingRequests.add(cacheKey))
      }));
      
      state.setLoading('dashboard', true);
      state.clearError('dashboard');
      
      const response = await api.get('/api/patients');
      const result = response.data.data;
      
      // Cache the result
      state.setCachedData(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Error fetching patients:', error);
      const errorMessage = error.response?.data?.message || 'Failed to fetch patients';
      state.setError('dashboard', errorMessage);
      throw error;
    } finally {
      // Remove from ongoing requests
      set((state) => {
        const newOngoing = new Set(state.ongoingRequests);
        newOngoing.delete(cacheKey);
        return { ongoingRequests: newOngoing };
      });
      state.setLoading('dashboard', false);
    }
  },

  // Authentication
  setCurrentUser: (user) => set({ currentUser: user }),
  
  logout: () => {
    set({
      currentUser: null,
      currentPatient: null,
      cache: new Map(),
      ongoingRequests: new Set(),
      loading: {
        profile: false,
        patients: false,
        dashboard: false,
      },
      errors: {
        profile: null,
        patients: null,
        dashboard: null,
      },
      messages: {
        success: null,
        error: null,
      },
    });
  },
}));

export default useAppStore;