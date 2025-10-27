import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PatientProfile from './pages/PatientProfile';
import MealPlan from './pages/MealPlan';
import DoctorPatientProfile from './pages/DoctorPatientProfile';
import DoctorMealPlan from './pages/DoctorMealPlan';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientDashboard from './pages/PatientDashboard';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="container mx-auto px-4 py-6 sm:py-8">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected Routes - General */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              
              {/* Patient Routes */}
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute requiredRole="patient">
                    <PatientProfile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/meal-plan" 
                element={
                  <ProtectedRoute requiredRole="patient">
                    <MealPlan />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/patient/dashboard" 
                element={
                  <ProtectedRoute requiredRole="patient">
                    <PatientDashboard />
                  </ProtectedRoute>
                } 
              />
              
              {/* Doctor Routes */}
              <Route 
                path="/doctor/dashboard" 
                element={
                  <ProtectedRoute requiredRole="doctor">
                    <DoctorDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/doctor/patient/:patientId" 
                element={
                  <ProtectedRoute requiredRole="doctor">
                    <DoctorPatientProfile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/doctor/patient/:patientId/meal-plan" 
                element={
                  <ProtectedRoute requiredRole="doctor">
                    <DoctorMealPlan />
                  </ProtectedRoute>
                } 
              />
              
              {/* Catch all route - redirect to home */}
              <Route path="*" element={<Home />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;