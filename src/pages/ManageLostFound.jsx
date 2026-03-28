import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Trash2, Eye, RefreshCw, Plus, X, Edit, Upload, CheckCircle, PackageCheck, Star } from 'lucide-react';

const ManageLostFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, name, status
  const [filterStatus, setFilterStatus] = useState('all'); // all, lost, found, claimed
  const [showFoundModal, setShowFoundModal] = useState(false);
  const [foundNoteItem, setFoundNoteItem] = useState(null);
  const [foundNote, setFoundNote] = useState('');
  const [markingFound, setMarkingFound] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimNoteItem, setClaimNoteItem] = useState(null);
  const [markingClaimed, setMarkingClaimed] = useState(false);
  const [formData, setFormData] = useState({
    itemName: '',
    description: '',
    status: 'lost',
    location: '',
    contactInfo: ''
  });

  useEffect(() => {
    fetchLostItems();
  }, []);

  // Auto-open item from notification click
  useEffect(() => {
    if (location.state?.itemId && location.state?.timestamp && items.length > 0) {
      const item = items.find(i => i.id === location.state.itemId);
      if (item) {
        console.log('📬 Opening lost/found item from notification:', location.state.itemId);
        handleViewDetails(item);
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, items]);

  const fetchLostItems = async () => {
    try {
      // Fetch from both lost_items and found_items collections
      const lostSnapshot = await getDocs(collection(db, 'lost_items'));
      const foundSnapshot = await getDocs(collection(db, 'found_items'));
      
      console.log('🔍 Lost items fetched:', lostSnapshot.size);
      console.log('🔍 Found items fetched:', foundSnapshot.size);
      
      const lostData = await Promise.all(lostSnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        console.log('📄 Lost item doc:', docSnap.id, data);
        
        // Fetch user data to get reporter name
        let reporterName = data.reporterName || data.userName || data.user || data.reportedBy || 'Unknown';
        let reporterEmail = data.userEmail || data.email || '';
        const userId = data.userId || data.uid;
        
        if (userId && reporterName === 'Unknown') {
          try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              reporterName = 
                userData.displayName || 
                userData.name ||
                (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}`.trim() : null) ||
                userData.firstName ||
                userData.username ||
                userData.email?.split('@')[0] ||
                'Unknown';
              reporterEmail = userData.email || '';
            }
          } catch (err) {
            console.error('Error fetching user for lost item:', err);
          }
        }
        
        return {
          id: docSnap.id,
          ...data,
          // Map different possible field names
          itemName: data.itemName || data.item || data.itemType || data.name || data.title,
          description: data.description || data.details || data.desc || data.location,
          reporterName,
          reporterEmail,
          collection: 'lost_items'
        };
      }));
      
      const foundData = await Promise.all(foundSnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        console.log('📄 Found item doc:', docSnap.id, data);
        
        // Fetch user data to get reporter name
        let reporterName = data.reporterName || data.userName || data.user || data.reportedBy || 'Unknown';
        let reporterEmail = data.userEmail || data.email || '';
        const userId = data.userId || data.uid;
        
        if (userId && reporterName === 'Unknown') {
          try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              reporterName = 
                userData.displayName || 
                userData.name ||
                (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}`.trim() : null) ||
                userData.firstName ||
                userData.username ||
                userData.email?.split('@')[0] ||
                'Unknown';
              reporterEmail = userData.email || '';
            }
          } catch (err) {
            console.error('Error fetching user for found item:', err);
          }
        }
        
        return {
          id: docSnap.id,
          ...data,
          // Map different possible field names
          itemName: data.itemName || data.item || data.itemType || data.name || data.title,
          description: data.description || data.details || data.desc || data.location,
          reporterName,
          reporterEmail,
          collection: 'found_items'
        };
      }));
      
      // Combine all data
      const allData = [...lostData, ...foundData];
      
      console.log('✅ Total items loaded:', allData.length);
      setItems(allData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching lost items:', error);
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const item = items.find(i => i.id === id);
        const collectionName = item?.collection || (item?.status === 'found' ? 'found_items' : 'lost_items');
        await deleteDoc(doc(db, collectionName, id));
        setItems(items.filter(item => item.id !== id));
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const handleAdd = () => {
    setSelectedItem(null);
    setImageFile(null);
    setImagePreview(null);
    setFormData({
      itemName: '',
      description: '',
      status: 'lost',
      location: '',
      contactInfo: ''
    });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setImageFile(null);
    setImagePreview(item.imageUrl || null);
    setFormData({
      itemName: item.itemName || '',
      description: item.description || '',
      status: item.status || 'lost',
      location: item.location || '',
      contactInfo: item.contactInfo || ''
    });
    setShowModal(true);
  };

  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
  };

  const openFoundModal = (item) => {
    setFoundNoteItem(item);
    setFoundNote('');
    setShowFoundModal(true);
  };

  const handleMarkAsFound = async () => {
    if (!foundNoteItem) return;
    setMarkingFound(true);
    try {
      // Always update in the lost_items collection so mobile app sees the change
      const collectionName = foundNoteItem.collection || 'lost_items';
      await updateDoc(doc(db, collectionName, foundNoteItem.id), {
        status: 'found',
        foundAt: serverTimestamp(),
        foundBy: 'Admin',
        foundNote: foundNote.trim() || '',
        adminFoundNote: foundNote.trim() || '',
        updatedAt: serverTimestamp()
      });

      // Update local state
      setItems(prev => prev.map(i =>
        i.id === foundNoteItem.id ? { ...i, status: 'found', foundNote: foundNote.trim() } : i
      ));
      // If details modal is open on this item, update selectedItem too
      if (selectedItem?.id === foundNoteItem.id) {
        setSelectedItem(prev => ({ ...prev, status: 'found', foundNote: foundNote.trim() }));
      }

      setShowFoundModal(false);
      setFoundNoteItem(null);
      setFoundNote('');
      alert(`✅ "${foundNoteItem.itemName}" has been marked as FOUND! The user will see the update in the app.`);
    } catch (error) {
      console.error('Error marking as found:', error);
      alert(`Failed to mark as found: ${error.message}`);
    } finally {
      setMarkingFound(false);
    }
  };

  const openClaimModal = (item) => {
    setClaimNoteItem(item);
    setShowClaimModal(true);
  };

  const handleMarkAsClaimed = async () => {
    if (!claimNoteItem) return;
    setMarkingClaimed(true);
    try {
      const collectionName = claimNoteItem.collection || 'lost_items';
      await updateDoc(doc(db, collectionName, claimNoteItem.id), {
        status: 'claimed',
        claimedAt: serverTimestamp(),
        claimedBy: 'Admin',
        updatedAt: serverTimestamp()
      });
      setItems(prev => prev.map(i =>
        i.id === claimNoteItem.id ? { ...i, status: 'claimed' } : i
      ));
      if (selectedItem?.id === claimNoteItem.id) {
        setSelectedItem(prev => ({ ...prev, status: 'claimed' }));
      }
      setShowClaimModal(false);
      setClaimNoteItem(null);
      alert(`✅ "${claimNoteItem.itemName}" marked as CLAIMED! The user can now rate their experience.`);
    } catch (error) {
      console.error('Error marking as claimed:', error);
      alert(`Failed: ${error.message}`);
    } finally {
      setMarkingClaimed(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file) => {
    try {
      setUploading(true);
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const folderPath = formData.status === 'found' ? 'found_items' : 'lost_items';
      const storageRef = ref(storage, `${folderPath}/${fileName}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      let imageUrl = selectedItem?.imageUrl || null;
      
      // Upload image if new image is selected
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const itemData = {
        ...formData,
        imageUrl,
        reporterName: 'Admin',
        userName: 'Admin'
      };

      // Determine which collection to use based on status
      const collectionName = formData.status === 'found' ? 'found_items' : 'lost_items';

      if (selectedItem) {
        // If changing status, we may need to move to different collection
        const oldCollection = selectedItem.collection || (selectedItem.status === 'found' ? 'found_items' : 'lost_items');
        
        if (oldCollection !== collectionName) {
          // Delete from old collection and add to new collection
          await deleteDoc(doc(db, oldCollection, selectedItem.id));
          await addDoc(collection(db, collectionName), {
            ...itemData,
            createdAt: selectedItem.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } else {
          // Update in same collection
          await updateDoc(doc(db, collectionName, selectedItem.id), {
            ...itemData,
            updatedAt: serverTimestamp()
          });
        }
      } else {
        // Add new item to appropriate collection
        await addDoc(collection(db, collectionName), {
          ...itemData,
          createdAt: serverTimestamp()
        });
      }
      
      setShowModal(false);
      setImageFile(null);
      setImagePreview(null);
      setFormData({
        itemName: '',
        description: '',
        status: 'lost',
        location: '',
        contactInfo: ''
      });
      
      // Refresh to show items from both collections
      await fetchLostItems();
    } catch (error) {
      console.error('Error saving item:', error);
      alert(`Failed to save item: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Apply filtering and sorting
  const getFilteredAndSortedItems = () => {
    let filtered = [...items];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : new Date(0));
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : new Date(0));
          return dateB - dateA;
        case 'oldest':
          const dateA2 = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : new Date(0));
          const dateB2 = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : new Date(0));
          return dateA2 - dateB2;
        case 'name':
          return (a.itemName || '').localeCompare(b.itemName || '');
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        case 'reporter':
          return (a.reporterName || '').localeCompare(b.reporterName || '');
        default:
          return 0;
      }
    });

    return filtered;
  };

  const displayItems = getFilteredAndSortedItems();

  if (loading) return <div className="text-xl">Loading items...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Manage Lost & Found</h1>
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
          >
            <Plus size={20} />
            Add Item
          </button>
          <button
            onClick={fetchLostItems}
            className="bg-[#4A90E2] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#3d7bc7]"
          >
            <RefreshCw size={20} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter and Sort Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Items</option>
            <option value="lost">Lost Only</option>
            <option value="found">Found Only</option>
            <option value="claimed">Claimed Only</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Item Name (A-Z)</option>
            <option value="status">Status</option>
            <option value="reporter">Reporter Name (A-Z)</option>
          </select>
        </div>

        <div className="ml-auto text-sm text-gray-600">
          Showing {displayItems.length} of {items.length} items
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#4A90E2] text-white">
            <tr>
              <th className="px-6 py-3 text-left">ID</th>
              <th className="px-6 py-3 text-left">Reported By</th>
              <th className="px-6 py-3 text-left">Image</th>
              <th className="px-6 py-3 text-left">Item Name</th>
              <th className="px-6 py-3 text-left">Description</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Date Reported</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayItems.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                  {items.length === 0 ? 'No lost & found items' : 'No items match the selected filter'}
                </td>
              </tr>
            ) : (
              displayItems.map((item, index) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">{index + 1}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-green-700 font-semibold text-xs">
                          {(item.name || item.reporterName || item.userName || 'A').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.name || item.reporterName || item.userName || 'Unknown'}
                        </p>
                        {(item.email || item.userEmail || item.reporterEmail) && (
                          <p className="text-xs text-gray-400 truncate">
                            {item.email || item.userEmail || item.reporterEmail}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.itemName} 
                        className="w-12 h-12 object-cover rounded border"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                        No image
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium">{item.itemName || 'N/A'}</td>
                  <td className="px-6 py-4">{item.description || 'No description'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.status === 'found' ? 'bg-green-100 text-green-700' :
                      item.status === 'claimed' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.status === 'found' ? '✅ Found' : item.status === 'claimed' ? '🏷️ Claimed' : '🔍 Lost'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const d = item.createdAt;
                      if (!d) return 'N/A';
                      if (typeof d.toDate === 'function') return d.toDate().toLocaleDateString();
                      if (d instanceof Date) return d.toLocaleDateString();
                      if (d.seconds) return new Date(d.seconds * 1000).toLocaleDateString();
                      return 'N/A';
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleViewDetails(item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      {item.status === 'lost' && (
                        <button 
                          onClick={() => openFoundModal(item)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded"
                          title="Mark as Found"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                      {item.status === 'found' && (
                        <button 
                          onClick={() => openClaimModal(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Mark as Claimed"
                        >
                          <PackageCheck size={18} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleEdit(item)}
                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"
                        title="Edit"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {selectedItem ? 'Edit Lost & Found Item' : 'Add Lost & Found Item'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Item Name *</label>
                <input
                  type="text"
                  required
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Blue Backpack"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Description *</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 min-h-[80px]"
                  placeholder="Describe the item..."
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="lost">Lost</option>
                  <option value="found">Found</option>
                  <option value="claimed">Claimed</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Where it was lost/found"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Contact Info</label>
                <input
                  type="text"
                  value={formData.contactInfo}
                  onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Phone or email"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  <Upload size={16} className="inline mr-1" />
                  Upload Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-40 object-cover rounded-lg border border-gray-300"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving ||uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading Image...' : saving ? 'Saving...' : (selectedItem ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Lost & Found Item Details</h2>
                <p className="text-xs text-gray-500 mt-0.5">ID: {selectedItem.id}</p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">

              {/* Status Banner */}
              <div className={`rounded-lg px-4 py-3 flex items-center gap-3 ${
                selectedItem.status === 'found' ? 'bg-green-50 border border-green-200' :
                selectedItem.status === 'claimed' ? 'bg-blue-50 border border-blue-200' :
                'bg-yellow-50 border border-yellow-200'
              }`}>
                <span className={`text-2xl`}>
                  {selectedItem.status === 'found' ? '✅' : selectedItem.status === 'claimed' ? '🏷️' : '🔍'}
                </span>
                <div>
                  <p className={`font-bold capitalize ${
                    selectedItem.status === 'found' ? 'text-green-800' :
                    selectedItem.status === 'claimed' ? 'text-blue-800' : 'text-yellow-800'
                  }`}>{selectedItem.status || 'Lost'}</p>
                  <p className="text-xs text-gray-500">
                    Reported: {selectedItem.createdAt?.toDate ? selectedItem.createdAt.toDate().toLocaleString() : 'N/A'}
                    {selectedItem.updatedAt?.toDate && ` · Updated: ${selectedItem.updatedAt.toDate().toLocaleString()}`}
                  </p>
                </div>
              </div>

              {/* Reporter Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">👤 Reporter Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Name</label>
                    <p className="font-medium text-gray-800 mt-0.5">
                      {selectedItem.name || selectedItem.reporterName || selectedItem.userName || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Email</label>
                    <p className="font-medium text-gray-800 mt-0.5 break-all">
                      {selectedItem.email || selectedItem.userEmail || selectedItem.reporterEmail || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Phone</label>
                    <p className="font-medium text-gray-800 mt-0.5">
                      {selectedItem.phone || selectedItem.contactNumber || selectedItem.phoneNumber || selectedItem.contactInfo || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">User ID</label>
                    <p className="font-medium text-gray-800 mt-0.5 text-xs break-all">
                      {selectedItem.userId || selectedItem.uid || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Item Info */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">📦 Item Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500">Item Name</label>
                    <p className="mt-0.5 px-3 py-2 bg-gray-50 rounded font-medium">
                      {selectedItem.itemName || selectedItem.item || selectedItem.name || 'N/A'}
                    </p>
                  </div>

                  {(selectedItem.description || selectedItem.details || selectedItem.desc) && (
                    <div>
                      <label className="text-xs text-gray-500">Description</label>
                      <p className="mt-0.5 px-3 py-2 bg-gray-50 rounded">
                        {selectedItem.description || selectedItem.details || selectedItem.desc}
                      </p>
                    </div>
                  )}

                  {(selectedItem.notes || selectedItem.additionalNotes) && (
                    <div>
                      <label className="text-xs text-gray-500">Additional Notes</label>
                      <p className="mt-0.5 px-3 py-2 bg-blue-50 rounded text-blue-900">
                        {selectedItem.notes || selectedItem.additionalNotes}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Location / Area</label>
                      <p className="mt-0.5 px-3 py-2 bg-gray-50 rounded">
                        {selectedItem.location || selectedItem.area || selectedItem.place || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Category / Type</label>
                      <p className="mt-0.5 px-3 py-2 bg-gray-50 rounded capitalize">
                        {selectedItem.category || selectedItem.itemType || selectedItem.type || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Item Image */}
              {selectedItem.imageUrl && (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide font-bold">🖼️ Item Image</label>
                  <div className="mt-2 bg-gray-50 rounded-lg p-2">
                    <img
                      src={selectedItem.imageUrl}
                      alt={selectedItem.itemName}
                      className="w-full max-h-72 object-contain rounded-lg"
                      loading="lazy"
                      onError={(e) => {
                        e.target.parentElement.innerHTML = '<div class="p-6 bg-gray-100 rounded-lg text-gray-500 text-center text-sm">Image not available</div>';
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Found Note (if marked as found by admin) */}
              {selectedItem.foundNote && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-green-800 mb-1">✅ Admin Found Note</h3>
                  <p className="text-green-800">{selectedItem.foundNote}</p>
                  {selectedItem.foundAt?.toDate && (
                    <p className="text-xs text-green-600 mt-1">
                      Marked found: {selectedItem.foundAt.toDate().toLocaleString()} by {selectedItem.foundBy || 'Admin'}
                    </p>
                  )}
                </div>
              )}

              {/* User Rating (shown after user rates) */}
              {selectedItem.rating && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-yellow-800 mb-2">⭐ User Rating</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1,2,3,4,5].map(i => (
                        <Star
                          key={i}
                          size={20}
                          className={i <= selectedItem.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-yellow-800">{selectedItem.rating}/5</span>
                  </div>
                  {selectedItem.ratingComment && (
                    <p className="mt-2 text-sm text-yellow-900 italic">"{selectedItem.ratingComment}"</p>
                  )}
                  {selectedItem.ratedAt?.toDate && (
                    <p className="text-xs text-yellow-600 mt-1">Rated: {selectedItem.ratedAt.toDate().toLocaleString()}</p>
                  )}
                </div>
              )}

            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-2">
              {selectedItem.status === 'lost' && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    openFoundModal(selectedItem);
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  Mark as Found
                </button>
              )}              {selectedItem.status === 'found' && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    openClaimModal(selectedItem);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <PackageCheck size={18} />
                  Mark as Claimed
                </button>
              )}              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  handleEdit(selectedItem);
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Edit Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Claimed Modal */}
      {showClaimModal && claimNoteItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <PackageCheck size={22} className="text-blue-600" />
                Mark Item as Claimed
              </h2>
              <button onClick={() => setShowClaimModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-blue-800 font-semibold">{claimNoteItem.itemName}</p>
              <p className="text-blue-700 text-sm mt-1">Reported by: {claimNoteItem.reporterName || 'Unknown'}</p>
            </div>

            <p className="text-gray-600 text-sm mb-4">
              Confirm that the owner has visited the barangay hall and physically claimed this item.
              The user will be prompted to <strong>rate their experience</strong> in the app.
            </p>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowClaimModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkAsClaimed}
                disabled={markingClaimed}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <PackageCheck size={16} />
                {markingClaimed ? 'Saving...' : 'Confirm Claimed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Found Modal */}
      {showFoundModal && foundNoteItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <CheckCircle size={22} className="text-green-600" />
                Mark Item as Found
              </h2>
              <button onClick={() => setShowFoundModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-green-800 font-semibold">{foundNoteItem.itemName}</p>
              <p className="text-green-700 text-sm mt-1">Reported by: {foundNoteItem.reporterName || 'Unknown'}</p>
            </div>

            <p className="text-gray-600 text-sm mb-4">
              This will update the item status to <strong>Found</strong>. The reporter will see this update
              immediately in their mobile app.
            </p>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Note (optional)</label>
              <textarea
                value={foundNote}
                onChange={(e) => setFoundNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 min-h-[80px]"
                placeholder="e.g., Item is at the barangay hall, contact us to claim..."
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowFoundModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkAsFound}
                disabled={markingFound}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle size={16} />
                {markingFound ? 'Saving...' : 'Confirm Found'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageLostFound;
