import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";
import DoctorPendingApproval from "../components/DoctorPendingApproval";
import useAppStore from "../stores/useAppStore";

const DoctorDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  // Zustand store
  const { loading, errors, fetchAllPatients, getCachedData } = useAppStore();

  const patients = getCachedData("all-patients") || [];

  // Memoized filtered patients to prevent unnecessary recalculations
  const filteredPatients = useMemo(() => {
    return patients.filter(
      (patient) =>
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [patients, searchTerm]);

  useEffect(() => {
    // Only fetch if we have patients data or if there's an error to show
    if (patients.length === 0 && !errors.dashboard) {
      fetchAllPatients();
    }
  }, []); // Empty dependency array to run only once

  const handlePatientClick = useCallback(
    (patientId) => {
      navigate(`/doctor/patient/${patientId}`);
    },
    [navigate]
  );

  const handleGenerateMealPlan = useCallback(
    (patientId, e) => {
      e.stopPropagation(); // Prevent row click
      navigate(`/doctor/patient/${patientId}/meal-plan`);
    },
    [navigate]
  );

  // Check if doctor is approved
  if (user?.role === 'doctor' && user?.approvalStatus !== 'approved') {
    return <DoctorPendingApproval />;
  }

  if (loading.dashboard) {
    return (
      <div className="max-w-6xl mx-auto">
        <LoadingSpinner size="lg" text="Loading patient data..." />
        {/* Show error after 5 seconds if still loading */}
        <div className="mt-4 text-center">
          <p className="text-gray-600">
            If this takes too long, please check your internet connection or try
            refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          👨‍⚕️ Doctor Dashboard
        </h1>
        <p className="text-gray-600">
          Manage your patients' profiles and meal plans
        </p>
      </div>

      {errors.dashboard && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">⚠</span>
            {errors.dashboard}
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Patients
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {patients.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">With Profiles</p>
              <p className="text-2xl font-semibold text-gray-900">
                {patients.filter((p) => p.profile).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <span className="text-2xl">🔍</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Search Results
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {filteredPatients.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full sm:w-auto">
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              🔍 Search Patients
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => fetchAllPatients(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-md hover:shadow-lg"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Patients List */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <span className="mr-2">👥</span>
            Patients ({filteredPatients.length})
          </h2>
        </div>

        {filteredPatients.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">
              {searchTerm ? "🔍" : "👥"}
            </div>
            <p className="text-gray-500 text-lg mb-2">
              {searchTerm
                ? "No patients found matching your search."
                : "No patients found."}
            </p>
            {searchTerm && (
              <p className="text-gray-400 text-sm">
                Try adjusting your search terms or clear the search to see all
                patients.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Health Info
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPatients.map((patient) => (
                  <tr
                    key={patient._id}
                    onClick={() => handlePatientClick(patient._id)}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center shadow-md">
                            <span className="text-lg font-bold text-white">
                              {patient.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {patient.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {patient.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {patient.profile ? (
                          <div className="space-y-1">
                            <div className="flex items-center">
                              <span className="text-gray-600 mr-2">Age:</span>
                              <span className="font-medium">
                                {patient.profile.age}
                              </span>
                            </div>
                            <div className="text-gray-500 text-xs">
                              {patient.profile.diseaseCondition}
                            </div>
                            {patient.profile.healthGoal && (
                              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full inline-block">
                                {patient.profile.healthGoal}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center text-gray-400">
                            <span className="mr-2">⚠</span>
                            <span className="italic">No profile</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {patient.profile?.updatedAt ? (
                        <div>
                          <div className="font-medium">
                            {new Date(
                              patient.profile.updatedAt
                            ).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(
                              patient.profile.updatedAt
                            ).toLocaleTimeString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Never</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePatientClick(patient._id);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                        >
                          👤 Profile
                        </button>
                        {patient.profile && (
                          <button
                            onClick={(e) =>
                              handleGenerateMealPlan(patient._id, e)
                            }
                            className="text-green-600 hover:text-green-800 font-semibold transition-colors"
                          >
                            🍽️ Meal Plan
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorDashboard;
