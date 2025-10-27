import React from 'react';
import useAppStore from '../stores/useAppStore';
import { useAuth } from '../contexts/AuthContext';

/**
 * Debug component to show current store state
 */
const ProfileDebug = () => {
  const { user } = useAuth();
  const { currentPatient, loading, errors, messages } = useAppStore();

  if (!user) {
    return <div className="p-4 bg-gray-100 rounded">No user logged in</div>;
  }

  return (
    <div className="p-4 bg-gray-100 rounded mb-4">
      <h3 className="font-bold mb-2">Debug Info:</h3>
      <div className="text-sm space-y-1">
        <div><strong>User ID:</strong> {user.id}</div>
        <div><strong>User Role:</strong> {user.role}</div>
        <div><strong>Loading:</strong> {JSON.stringify(loading)}</div>
        <div><strong>Errors:</strong> {JSON.stringify(errors)}</div>
        <div><strong>Messages:</strong> {JSON.stringify(messages)}</div>
        <div><strong>Current Patient:</strong> {currentPatient ? 'Loaded' : 'Not loaded'}</div>
        {currentPatient && (
          <div className="ml-4">
            <div><strong>Has Age:</strong> {currentPatient.age ? 'Yes' : 'No'}</div>
            <div><strong>Has Profile:</strong> {currentPatient.profile ? 'Yes' : 'No'}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileDebug;