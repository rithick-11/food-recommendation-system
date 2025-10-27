import { useAuth } from '../contexts/AuthContext';

const DoctorPendingApproval = () => {
  const { user, logout } = useAuth();

  const getStatusMessage = () => {
    switch (user?.approvalStatus) {
      case 'pending':
        return {
          title: 'Account Pending Approval',
          message: 'Your doctor account is currently under review by our administrators. You will receive access to patient data once your account is approved.',
          icon: '⏳',
          color: 'yellow'
        };
      case 'rejected':
        return {
          title: 'Account Not Approved',
          message: 'Unfortunately, your doctor account application was not approved. Please contact support for more information.',
          icon: '❌',
          color: 'red'
        };
      default:
        return {
          title: 'Account Status Unknown',
          message: 'There seems to be an issue with your account status. Please contact support.',
          icon: '❓',
          color: 'gray'
        };
    }
  };

  const status = getStatusMessage();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 ${
          status.color === 'yellow' ? 'bg-yellow-100' :
          status.color === 'red' ? 'bg-red-100' : 'bg-gray-100'
        }`}>
          <span className="text-2xl">{status.icon}</span>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {status.title}
        </h1>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          {status.message}
        </p>
        
        {user?.approvalStatus === 'pending' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
            <ul className="text-sm text-blue-800 text-left space-y-1">
              <li>• Our administrators will review your application</li>
              <li>• You will be notified via email once a decision is made</li>
              <li>• Approved doctors gain access to patient management features</li>
              <li>• This process typically takes 1-2 business days</li>
            </ul>
          </div>
        )}
        
        <div className="space-y-3">
          <div className="text-sm text-gray-500">
            <p><strong>Account:</strong> {user?.name}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Status:</strong> 
              <span className={`ml-1 px-2 py-1 text-xs font-medium rounded-full ${
                status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                status.color === 'red' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {user?.approvalStatus?.charAt(0).toUpperCase() + user?.approvalStatus?.slice(1)}
              </span>
            </p>
          </div>
          
          <div className="flex justify-center space-x-4 pt-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Refresh Status
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorPendingApproval;