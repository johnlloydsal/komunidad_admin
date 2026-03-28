import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Shield, Calendar, Edit2, Save, X } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const Profile = () => {
  const { adminData, user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    displayName: adminData?.displayName || '',
    email: adminData?.email || '',
    phone: adminData?.phone || '',
    role: adminData?.role || 'Admin'
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update Firebase Auth profile
      if (formData.displayName !== user.displayName) {
        await updateProfile(auth.currentUser, {
          displayName: formData.displayName
        });
      }

      // Update Firestore document
      const adminRef = doc(db, 'admins', user.uid);
      await updateDoc(adminRef, {
        displayName: formData.displayName,
        phone: formData.phone,
        updatedAt: new Date()
      });

      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      displayName: adminData?.displayName || '',
      email: adminData?.email || '',
      phone: adminData?.phone || '',
      role: adminData?.role || 'Admin'
    });
    setIsEditing(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Profile</h1>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <Edit2 size={18} />
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-600 transition"
            >
              <X size={18} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center border-4 border-blue-100 mb-4">
                <span className="text-white text-3xl font-bold">
                  {adminData?.displayName?.charAt(0) || 'A'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-800">{adminData?.displayName || 'Admin User'}</h2>
              <p className="text-sm text-gray-500">{adminData?.role || 'Administrator'}</p>
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={14} />
                <span>Joined {user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
            <h3 className="font-bold text-gray-800 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Account Status</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Active</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Email Verified</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  user?.emailVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {user?.emailVerified ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Profile Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <User size={16} />
                    Full Name
                  </div>
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-800 bg-gray-50 px-4 py-2 rounded-lg">{adminData?.displayName || 'Not set'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Mail size={16} />
                    Email Address
                  </div>
                </label>
                <p className="text-gray-800 bg-gray-50 px-4 py-2 rounded-lg">{adminData?.email || user?.email || 'Not set'}</p>
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Shield size={16} />
                    Role
                  </div>
                </label>
                <p className="text-gray-800 bg-gray-50 px-4 py-2 rounded-lg">{adminData?.role || 'Administrator'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-800 bg-gray-50 px-4 py-2 rounded-lg">{adminData?.phone || 'Not set'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User ID
                </label>
                <p className="text-gray-600 bg-gray-50 px-4 py-2 rounded-lg text-sm font-mono break-all">
                  {user?.uid || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Account Security</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">Password</p>
                  <p className="text-sm text-gray-600">Last changed: Never</p>
                </div>
                <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                  Change Password
                </button>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">Two-Factor Authentication</p>
                  <p className="text-sm text-gray-600">Not enabled</p>
                </div>
                <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                  Enable 2FA
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
