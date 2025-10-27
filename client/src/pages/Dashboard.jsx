import { useAuth } from '../contexts/AuthContext';
import PatientDashboard from './PatientDashboard';
import DoctorDashboard from './DoctorDashboard';
import AdminDashboard from './AdminDashboard';

const Dashboard = () => {
  const { isPatient, isDoctor, isAdmin } = useAuth();

  if (isPatient()) {
    return <PatientDashboard />;
  }

  if (isDoctor()) {
    return <DoctorDashboard />;
  }

  if (isAdmin()) {
    return <AdminDashboard />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Dashboard
      </h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">
          Please log in to access your dashboard.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;