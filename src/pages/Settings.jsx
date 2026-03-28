import { useState } from 'react';
import { Bell, Moon, Globe, Lock, Shield, Eye, Database, Smartphone } from 'lucide-react';

const Settings = () => {
  const [settings, setSettings] = useState({
    notifications: {
      newReports: true,
      newFeedback: true,
      newUsers: false,
      emailNotifications: true,
      pushNotifications: false
    },
    appearance: {
      darkMode: false,
      compactView: false,
      language: 'en'
    },
    privacy: {
      showEmail: false,
      showProfile: true,
      activityStatus: true
    }
  });

  const [saving, setSaving] = useState(false);

  const handleToggle = (category, key) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category][key]
      }
    }));
  };

  const handleSave = () => {
    setSaving(true);
    // Simulate save to database
    setTimeout(() => {
      localStorage.setItem('adminSettings', JSON.stringify(settings));
      setSaving(false);
      alert('Settings saved successfully!');
    }, 1000);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Notifications Settings */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="text-blue-600" size={24} />
            <h2 className="text-xl font-bold">Notification Preferences</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b">
              <div>
                <p className="font-medium text-gray-800">New Reports</p>
                <p className="text-sm text-gray-600">Get notified when users submit new reports</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.newReports}
                  onChange={() => handleToggle('notifications', 'newReports')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex justify-between items-center py-3 border-b">
              <div>
                <p className="font-medium text-gray-800">New Feedback</p>
                <p className="text-sm text-gray-600">Get notified when users leave feedback</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.newFeedback}
                  onChange={() => handleToggle('notifications', 'newFeedback')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex justify-between items-center py-3 border-b">
              <div>
                <p className="font-medium text-gray-800">New User Registrations</p>
                <p className="text-sm text-gray-600">Get notified when new users register</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.newUsers}
                  onChange={() => handleToggle('notifications', 'newUsers')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex justify-between items-center py-3 border-b">
              <div>
                <p className="font-medium text-gray-800">Email Notifications</p>
                <p className="text-sm text-gray-600">Receive notifications via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.emailNotifications}
                  onChange={() => handleToggle('notifications', 'emailNotifications')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex justify-between items-center py-3">
              <div>
                <p className="font-medium text-gray-800">Push Notifications</p>
                <p className="text-sm text-gray-600">Receive browser push notifications</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.pushNotifications}
                  onChange={() => handleToggle('notifications', 'pushNotifications')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="text-purple-600" size={24} />
            <h2 className="text-xl font-bold">Appearance</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b">
              <div>
                <p className="font-medium text-gray-800">Dark Mode</p>
                <p className="text-sm text-gray-600">Use dark theme across the application</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.appearance.darkMode}
                  onChange={() => handleToggle('appearance', 'darkMode')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="flex justify-between items-center py-3 border-b">
              <div>
                <p className="font-medium text-gray-800">Compact View</p>
                <p className="text-sm text-gray-600">Show more content in less space</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.appearance.compactView}
                  onChange={() => handleToggle('appearance', 'compactView')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="py-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
              <select
                value={settings.appearance.language}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  appearance: { ...prev.appearance, language: e.target.value }
                }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="en">English</option>
                <option value="fil">Filipino</option>
                <option value="es">Spanish</option>
              </select>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="text-green-600" size={24} />
            <h2 className="text-xl font-bold">Privacy & Security</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b">
              <div>
                <p className="font-medium text-gray-800">Show Email Address</p>
                <p className="text-sm text-gray-600">Display your email on your profile</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.privacy.showEmail}
                  onChange={() => handleToggle('privacy', 'showEmail')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex justify-between items-center py-3 border-b">
              <div>
                <p className="font-medium text-gray-800">Public Profile</p>
                <p className="text-sm text-gray-600">Make your profile visible to others</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.privacy.showProfile}
                  onChange={() => handleToggle('privacy', 'showProfile')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex justify-between items-center py-3">
              <div>
                <p className="font-medium text-gray-800">Activity Status</p>
                <p className="text-sm text-gray-600">Show when you're online</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.privacy.activityStatus}
                  onChange={() => handleToggle('privacy', 'activityStatus')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Data & Storage */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="text-orange-600" size={24} />
            <h2 className="text-xl font-bold">Data & Storage</h2>
          </div>
          
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition">
              <p className="font-medium text-gray-800">Clear Cache</p>
              <p className="text-sm text-gray-600">Remove temporary files and data</p>
            </button>
            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition">
              <p className="font-medium text-gray-800">Export Data</p>
              <p className="text-sm text-gray-600">Download a copy of your data</p>
            </button>
            <button className="w-full text-left px-4 py-3 bg-red-50 hover:bg-red-100 rounded-lg transition text-red-600">
              <p className="font-medium">Delete Account</p>
              <p className="text-sm">Permanently delete your account and all data</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
