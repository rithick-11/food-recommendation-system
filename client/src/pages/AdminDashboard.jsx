import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Notification from '../components/Notification';

const AdminDashboard = () => {
  const [doctors, setDoctors] = useState([]);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [approvalReason, setApprovalReason] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [actionType, setActionType] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pendingResponse, allResponse] = await Promise.all([
        adminAPI.getPendingDoctors(),
        adminAPI.getAllDoctors()
      ]);
      
      setPendingDoctors(pendingResponse.data.data.doctors);
      setDoctors(allResponse.data.data.doctors);
    } catch (error) {
      console.error('Error fetching data:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load doctor data'
      });
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleApprovalAction = (doctor, action) => {
    setSelectedDoctor(doctor);
    setActionType(action);
    setApprovalReason('');
    setShowReasonModal(true);
  };

  const confirmAction = async () => {
    if (!selectedDoctor) return;

    try {
      setActionLoading(selectedDoctor._id);
      
      if (actionType === 'approve') {
        await adminAPI.approveDoctor(selectedDoctor._id, approvalReason);
        showNotification('success', `Doctor ${selectedDoctor.name} has been approved`);
      } else {
        await adminAPI.rejectDoctor(selectedDoctor._id, approvalReason);
        showNotification('success', `Doctor ${selectedDoctor.name} has been rejected`);
      }
      
      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error updating doctor status:', error);
      showNotification('error', `Failed to ${actionType} doctor`);
    } finally {
      setActionLoading(null);
      setShowReasonModal(false);
      setSelectedDoctor(null);
      setApprovalReason('');
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage doctor approvals and system administration</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Approvals ({pendingDoctors.length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Doctors ({doctors.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'pending' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Pending Doctor Approvals
              </h2>
              
              {pendingDoctors.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-lg mb-2">✓</div>
                  <p className="text-gray-500">No pending approvals</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingDoctors.map((doctor) => (
                    <div key={doctor._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-medium text-gray-900">
                              {doctor.name}
                            </h3>
                            {getStatusBadge(doctor.approvalStatus)}
                          </div>
                          <p className="text-gray-600 mt-1">{doctor.email}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Registered: {formatDate(doctor.createdAt)}
                          </p>
                        </div>
                        
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleApprovalAction(doctor, 'approve')}
                            disabled={actionLoading === doctor._id}
                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoading === doctor._id ? 'Processing...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleApprovalAction(doctor, 'reject')}
                            disabled={actionLoading === doctor._id}
                            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoading === doctor._id ? 'Processing...' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'all' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                All Doctors
              </h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Doctor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registered
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {doctors.map((doctor) => (
                      <tr key={doctor._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {doctor.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {doctor.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(doctor.approvalStatus)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(doctor.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {doctor.approvalStatus === 'pending' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleApprovalAction(doctor, 'approve')}
                                disabled={actionLoading === doctor._id}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleApprovalAction(doctor, 'reject')}
                                disabled={actionLoading === doctor._id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {doctor.approvalStatus !== 'pending' && (
                            <span className="text-gray-400">No actions available</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reason Modal */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {actionType === 'approve' ? 'Approve' : 'Reject'} Doctor
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {actionType === 'approve' 
                  ? `Are you sure you want to approve ${selectedDoctor?.name}?`
                  : `Are you sure you want to reject ${selectedDoctor?.name}?`
                }
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (optional)
                </label>
                <textarea
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder={`Enter reason for ${actionType}...`}
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowReasonModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                    actionType === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {actionType === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;