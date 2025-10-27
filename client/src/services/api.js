import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Admin API functions
export const adminAPI = {
  // Get all pending doctors
  getPendingDoctors: () => api.get('/api/admin/doctors/pending'),
  
  // Get all doctors
  getAllDoctors: () => api.get('/api/admin/doctors'),
  
  // Approve a doctor
  approveDoctor: (doctorId, reason) => 
    api.put(`/api/admin/doctors/${doctorId}/approve`, { reason }),
  
  // Reject a doctor
  rejectDoctor: (doctorId, reason) => 
    api.put(`/api/admin/doctors/${doctorId}/reject`, { reason }),
};

export default api;