import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  orderBy
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { Users, Building2, Trash2, Edit, Plus, X } from 'lucide-react';

function ManageBarangayInfo() {
  const [activeTab, setActiveTab] = useState('officials'); // officials or facilities
  const [officials, setOfficials] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    category: '',
    description: '',
    address: '',
    operatingHours: '',
    contactNumber: '',
    imageUrl: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const officialPositions = [
    'Barangay Captain',
    'Kagawad',
    'Barangay Tanod',
    'Secretary',
    'Treasurer',
    'SK Chairman',
    'Health Worker',
    'Other Staff'
  ];

  const facilityCategories = [
    'Barangay Hall',
    'Gymnasium',
    'Health Center',
    'Multi-Purpose Hall',
    'Daycare Center',
    'Basketball Court',
    'Covered Court',
    'Other Facility'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchOfficials(), fetchFacilities()]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOfficials = async () => {
    try {
      // Ensure user is authenticated
      const currentUser = auth.currentUser;
      console.log('Current user:', currentUser);
      
      if (!currentUser) {
        console.error('No authenticated user found');
        alert('Please login to access this page');
        return;
      }

      // Force token refresh to ensure we have valid authentication
      await currentUser.getIdToken(true);
      
      const officialsRef = collection(db, 'barangay_officials');
      const q = query(officialsRef, orderBy('position', 'asc'));
      const snapshot = await getDocs(q);
      
      const officialsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setOfficials(officialsData);
      console.log('Fetched officials:', officialsData);
    } catch (error) {
      console.error('Error fetching officials:', error);
      alert('Error loading officials. Please refresh the page and try again.');
    }
  };

  const fetchFacilities = async () => {
    try {
      // Ensure user is authenticated
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.error('No authenticated user found');
        return;
      }

      // Force token refresh
      await currentUser.getIdToken(true);
      
      const facilitiesRef = collection(db, 'barangay_facilities');
      const q = query(facilitiesRef, orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      
      const facilitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setFacilities(facilitiesData);
      console.log('Fetched facilities:', facilitiesData);
    } catch (error) {
      console.error('Error fetching facilities:', error);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!imageFile) return formData.imageUrl;

    try {
      const folder = activeTab === 'officials' ? 'barangay_officials' : 'barangay_facilities';
      const timestamp = Date.now();
      const storageRef = ref(storage, `${folder}/${timestamp}_${imageFile.name}`);
      
      await uploadBytes(storageRef, imageFile);
      const downloadURL = await getDownloadURL(storageRef);
      
      console.log('Image uploaded:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Form submitted, activeTab:', activeTab);
    console.log('Form data:', formData);
    
    // Check if user is authenticated
    const currentUser = auth.currentUser;
    console.log('Current user:', currentUser);
    
    if (!currentUser) {
      alert('You must be logged in to perform this action');
      return;
    }
    
    // Force token refresh to ensure valid authentication
    try {
      await currentUser.getIdToken(true);
      console.log('Token refreshed successfully');
    } catch (error) {
      console.error('Error refreshing token:', error);
      alert('Authentication error. Please logout and login again.');
      return;
    }
    
    if (!formData.name.trim()) {
      alert('Please enter a name');
      return;
    }

    if (activeTab === 'officials' && !formData.position) {
      alert('Please select a position');
      return;
    }

    if (activeTab === 'facilities' && !formData.category) {
      alert('Please select a category');
      return;
    }

    try {
      setUploading(true);
      
      const imageUrl = await uploadImage();
      
      const data = {
        name: formData.name.trim(),
        ...(activeTab === 'officials' 
          ? { position: formData.position }
          : { 
              category: formData.category,
              description: formData.description.trim(),
              address: formData.address.trim(),
              operatingHours: formData.operatingHours.trim(),
              contactNumber: formData.contactNumber.trim()
            }
        ),
        imageUrl: imageUrl || '',
        updatedAt: new Date()
      };

      console.log('Data to save:', data);

      const collectionName = activeTab === 'officials' ? 'barangay_officials' : 'barangay_facilities';
      console.log('Saving to collection:', collectionName);

      if (editingItem) {
        await updateDoc(doc(db, collectionName, editingItem.id), data);
        console.log('Updated successfully');
        alert('Updated successfully!');
      } else {
        data.createdAt = new Date();
        const docRef = await addDoc(collection(db, collectionName), data);
        console.log('Added successfully with ID:', docRef.id);
        alert('Added successfully!');
      }

      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving data:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      alert('Failed to save: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      position: item.position || '',
      category: item.category || '',
      description: item.description || '',
      address: item.address || '',
      operatingHours: item.operatingHours || '',
      contactNumber: item.contactNumber || '',
      imageUrl: item.imageUrl || ''
    });
    setImagePreview(item.imageUrl || '');
    setShowModal(true);
  };

  const handleDelete = async (item) => {
    if (!confirm(`Are you sure you want to delete ${item.name}?`)) return;

    // Check if user is authenticated
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert('You must be logged in to perform this action');
      return;
    }

    // Force token refresh
    try {
      await currentUser.getIdToken(true);
    } catch (error) {
      console.error('Error refreshing token:', error);
      alert('Authentication error. Please logout and login again.');
      return;
    }

    try {
      const collectionName = activeTab === 'officials' ? 'barangay_officials' : 'barangay_facilities';
      await deleteDoc(doc(db, collectionName, item.id));
      alert('Deleted successfully!');
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      position: '',
      category: '',
      description: '',
      address: '',
      operatingHours: '',
      contactNumber: '',
      imageUrl: ''
    });
    setImageFile(null);
    setImagePreview('');
    setEditingItem(null);
    setShowModal(false);
  };

  const currentData = activeTab === 'officials' ? officials : facilities;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading barangay information...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Barangay Information</h1>
        <p className="text-gray-600">Manage barangay officials and facilities</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('officials')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'officials'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <span>Barangay Officials</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('facilities')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'facilities'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            <span>Barangay Facilities</span>
          </div>
        </button>
      </div>

      {/* Add Button */}
      <div className="mb-6">
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add {activeTab === 'officials' ? 'Official' : 'Facility'}
        </button>
      </div>

      {/* Grid Display */}
      {currentData.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
            {activeTab === 'officials' ? <Users className="w-full h-full" /> : <Building2 className="w-full h-full" />}
          </div>
          <p className="text-gray-500 text-lg">No {activeTab === 'officials' ? 'officials' : 'facilities'} added yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentData.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
              <div className="relative h-48 bg-gray-200">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    {activeTab === 'officials' ? <Users className="w-16 h-16" /> : <Building2 className="w-16 h-16" />}
                  </div>
                )}
              </div>
              
              <div className="p-4">
                <h3 className="font-bold text-gray-800 mb-1">{item.name}</h3>
                {activeTab === 'officials' ? (
                  <p className="text-sm text-blue-600 mb-2">{item.position}</p>
                ) : (
                  <>
                    <p className="text-sm text-blue-600 mb-1">{item.category}</p>
                    {item.address && (
                      <p className="text-xs text-gray-500 line-clamp-1">{item.address}</p>
                    )}
                  </>
                )}
                
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="flex-1 text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="text-red-600 hover:bg-red-50 p-1.5 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {editingItem ? 'Edit' : 'Add'} {activeTab === 'officials' ? 'Official' : 'Facility'}
                </h2>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Photo {activeTab === 'officials' ? '(Official)' : '(Facility)'}
                    </label>
                    
                    {imagePreview && (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg mb-2"
                      />
                    )}
                    
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  {/* Name */}
                  {activeTab === 'officials' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>
                  )}

                  {/* Position (Officials) or Category/Details (Facilities) */}
                  {activeTab === 'officials' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Position *
                      </label>
                      <select
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        required
                      >
                        <option value="">Select Position</option>
                        {officialPositions.map((pos) => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <>
                      {/* Facility Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Facility Name *
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="e.g., Barangay Buntatala Gym"
                          required
                        />
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Category *
                        </label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          required
                        >
                          <option value="">Select Category</option>
                          {facilityCategories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Address
                        </label>
                        <input
                          type="text"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="e.g., Main Street, Barangay Center"
                        />
                      </div>

                      {/* Operating Hours */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Operating Hours
                        </label>
                        <input
                          type="text"
                          value={formData.operatingHours}
                          onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="e.g., Monday-Friday, 8:00 AM - 5:00 PM"
                        />
                      </div>

                      {/* Contact Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Contact Number
                        </label>
                        <input
                          type="text"
                          value={formData.contactNumber}
                          onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="e.g., 123-4567"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          rows="3"
                          placeholder="Enter facility description..."
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {uploading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{selectedItem.name}</h2>
                <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {selectedItem.imageUrl && (
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.name}
                  className="w-full h-96 object-cover rounded-lg mb-4"
                />
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="text-gray-900">{selectedItem.name}</p>
                </div>

                {activeTab === 'officials' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Position</label>
                    <p className="text-gray-900">{selectedItem.position}</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
                      <p className="text-gray-900">{selectedItem.category || 'N/A'}</p>
                    </div>
                    
                    {selectedItem.address && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <p className="text-gray-900">{selectedItem.address}</p>
                      </div>
                    )}
                    
                    {selectedItem.operatingHours && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Operating Hours</label>
                        <p className="text-gray-900">{selectedItem.operatingHours}</p>
                      </div>
                    )}
                    
                    {selectedItem.contactNumber && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Contact Number</label>
                        <p className="text-gray-900">{selectedItem.contactNumber}</p>
                      </div>
                    )}
                    
                    {selectedItem.description && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <p className="text-gray-900">{selectedItem.description}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    handleEdit(selectedItem);
                    setSelectedItem(null);
                  }}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageBarangayInfo;
