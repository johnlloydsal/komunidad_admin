import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc, serverTimestamp, query, orderBy, getDoc, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { Trash2, Eye, RefreshCw, Plus, X, Edit, Upload, Package, CheckCircle, Clock, ArrowLeft } from 'lucide-react';

const ManageSupplies = () => {
  const navigate = useNavigate();
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    itemName: '',
    description: '',
    quantity: 0,
    availableQuantity: 0,
    category: '',
    condition: 'good'
  });

  useEffect(() => {
    fetchSupplies();
  }, []);

  const fetchSupplies = async () => {
    try {
      // Refresh auth token
      const currentUser = auth.currentUser;
      if (currentUser) await currentUser.getIdToken(true);
      
      // Fetch supplies sorted by newest first
      const suppliesQuery = query(collection(db, 'supplies'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(suppliesQuery);
      
      // Fetch all borrowed items
      const borrowedQuery = query(collection(db, 'borrowed_supplies'));
      const borrowedSnapshot = await getDocs(borrowedQuery);
      
      // Calculate borrowed count per supply
      const borrowedCounts = {};
      borrowedSnapshot.docs.forEach(borrowDoc => {
        const borrowData = borrowDoc.data();
        const supplyId = borrowData.supplyId;
        const status = borrowData.status;
        
        // Only count items that are currently borrowed or pending (not returned)
        if (supplyId && (status === 'borrowed' || status === 'pending')) {
          if (!borrowedCounts[supplyId]) {
            borrowedCounts[supplyId] = 0;
          }
          borrowedCounts[supplyId] += (borrowData.quantity || 1);
        }
      });
      
      // Map supplies with real borrowed count
      const data = snapshot.docs.map(doc => {
        const supplyData = doc.data();
        const realBorrowedCount = borrowedCounts[doc.id] || 0;
        
        return {
          id: doc.id,
          ...supplyData,
          borrowedCount: realBorrowedCount // Add real-time borrowed count
        };
      });
      
      console.log('✅ Supplies loaded with borrowed counts:', data.map(s => ({
        name: s.itemName,
        borrowed: s.borrowedCount,
        available: s.availableQuantity
      })));

      // Auto-fix: sync availableQuantity in Firestore if it doesn't match reality
      const syncPromises = data.map(supply => {
        const realAvailable = Math.max(0, (supply.quantity || 0) - (supply.borrowedCount || 0));
        if (supply.availableQuantity !== realAvailable) {
          console.log(`🔧 Fixing ${supply.itemName}: availableQuantity ${supply.availableQuantity} → ${realAvailable}`);
          return updateDoc(doc(db, 'supplies', supply.id), {
            availableQuantity: realAvailable,
            status: realAvailable > 0 ? 'available' : 'unavailable',
            updatedAt: serverTimestamp()
          });
        }
        return Promise.resolve();
      });
      await Promise.all(syncPromises);
      
      setSupplies(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching supplies:', error);
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this supply item?')) {
      try {
        await deleteDoc(doc(db, 'supplies', id));
        setSupplies(supplies.filter(supply => supply.id !== id));
      } catch (error) {
        console.error('Error deleting supply:', error);
      }
    }
  };

  const handleAdd = () => {
    setSelectedSupply(null);
    setImageFile(null);
    setImagePreview(null);
    setFormData({
      itemName: '',
      description: '',
      quantity: 0,
      availableQuantity: 0,
      category: '',
      condition: 'good'
    });
    setShowModal(true);
  };

  const handleEdit = (supply) => {
    setSelectedSupply(supply);
    setImageFile(null);
    setImagePreview(supply.imageUrl || null);
    setFormData({
      itemName: supply.itemName || '',
      description: supply.description || '',
      quantity: supply.quantity || 0,
      availableQuantity: supply.availableQuantity || 0,
      category: supply.category || '',
      condition: supply.condition || 'good'
    });
    setShowModal(true);
  };

  const handleViewDetails = (supply) => {
    setSelectedSupply(supply);
    setShowDetailsModal(true);
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

  const uploadImage = async (file) => {
    try {
      setUploading(true);
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `supplies/${fileName}`);
      
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
      let imageUrl = selectedSupply?.imageUrl || null;
      
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      // Compute availableQuantity from total quantity minus currently active borrows
      const activeBorrows = selectedSupply?.borrowedCount || 0;
      const computedAvailable = Math.max(0, parseInt(formData.quantity) - activeBorrows);

      const supplyData = {
        ...formData,
        quantity: parseInt(formData.quantity),
        availableQuantity: computedAvailable,
        imageUrl,
        status: computedAvailable > 0 ? 'available' : 'unavailable'
      };

      if (selectedSupply) {
        await updateDoc(doc(db, 'supplies', selectedSupply.id), {
          ...supplyData,
          updatedAt: serverTimestamp()
        });
        setSupplies(supplies.map(supply => 
          supply.id === selectedSupply.id ? { ...supply, ...supplyData } : supply
        ));
      } else {
        const docRef = await addDoc(collection(db, 'supplies'), {
          ...supplyData,
          createdAt: serverTimestamp()
        });
        setSupplies([{ id: docRef.id, ...supplyData, createdAt: new Date() }, ...supplies]);
      }
      
      setShowModal(false);
      setImageFile(null);
      setImagePreview(null);
      setFormData({
        itemName: '',
        description: '',
        quantity: 0,
        availableQuantity: 0,
        category: '',
        condition: 'good'
      });
    } catch (error) {
      console.error('Error saving supply:', error);
      alert(`Failed to save supply: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-xl">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/reports')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
            title="Back to Reports"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Barangay Supplies</h1>
            <p className="text-gray-600 text-sm mt-1">Manage items available for borrowing by community members</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
          >
            <Plus size={20} />
            Add Supply
          </button>
          <button
            onClick={fetchSupplies}
            className="bg-[#4A90E2] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#3d7bc7]"
          >
            <RefreshCw size={20} />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#4A90E2] text-white">
            <tr>
              <th className="px-6 py-3 text-left">ID</th>
              <th className="px-6 py-3 text-left">Image</th>
              <th className="px-6 py-3 text-left">Item Name</th>
              <th className="px-6 py-3 text-left">Category</th>
              <th className="px-6 py-3 text-left">Total Qty</th>
              <th className="px-6 py-3 text-left">Available</th>
              <th className="px-6 py-3 text-left">Borrowed</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {supplies.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                  <Package size={48} className="mx-auto mb-2 text-gray-400" />
                  No supplies yet. Add items that community members can borrow.
                </td>
              </tr>
            ) : (
              supplies.map((supply, index) => {
                // Use real borrowed count from Firebase instead of calculated value
                const borrowed = supply.borrowedCount || 0;
                // Real available = total quantity minus currently borrowed/pending
                const realAvailable = Math.max(0, (supply.quantity || 0) - borrowed);
                return (
                  <tr key={supply.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">{index + 1}</td>
                    <td className="px-6 py-4">
                      {supply.imageUrl ? (
                        <img 
                          src={supply.imageUrl} 
                          alt={supply.itemName} 
                          className="w-12 h-12 object-cover rounded border"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400">
                          <Package size={24} />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium">{supply.itemName || 'N/A'}</td>
                    <td className="px-6 py-4">{supply.category || 'Uncategorized'}</td>
                    <td className="px-6 py-4">{supply.quantity || 0}</td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${realAvailable > 0 ? 'text-green-600' : 'text-red-500'}`}>{realAvailable}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-blue-600">{borrowed}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        realAvailable > 0 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {realAvailable > 0 ? 'Available' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleViewDetails(supply)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleEdit(supply)}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(supply.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
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
                {selectedSupply ? 'Edit Supply Item' : 'Add Supply Item'}
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
                  placeholder="e.g., Folding Chair"
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
                <label className="block text-gray-700 text-sm font-bold mb-2">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Furniture, Equipment, Tools"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Total Quantity *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Available (auto-computed)</label>
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-green-700 font-semibold">
                    {Math.max(0, parseInt(formData.quantity || 0) - (selectedSupply?.borrowedCount || 0))}
                    <span className="text-xs text-gray-400 ml-2 font-normal">qty − borrows</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Condition</label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="needs_repair">Needs Repair</option>
                </select>
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
                  disabled={saving || uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading Image...' : saving ? 'Saving...' : (selectedSupply ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedSupply && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Supply Details</h2>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-3">
              {selectedSupply.imageUrl && (
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block">Item Image</label>
                  <div className="mt-1 bg-gray-50 rounded-lg p-2">
                    <img 
                      src={selectedSupply.imageUrl} 
                      alt={selectedSupply.itemName} 
                      className="w-full max-h-96 object-contain rounded-lg"
                      loading="lazy"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-bold text-gray-700">Item Name</label>
                <p className="mt-1 px-3 py-2 bg-gray-50 rounded">{selectedSupply.itemName || 'N/A'}</p>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">Description</label>
                <p className="mt-1 px-3 py-2 bg-gray-50 rounded">{selectedSupply.description || 'No description'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-gray-700">Category</label>
                  <p className="mt-1 px-3 py-2 bg-gray-50 rounded">{selectedSupply.category || 'Uncategorized'}</p>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">Condition</label>
                  <p className="mt-1 px-3 py-2 bg-gray-50 rounded capitalize">{selectedSupply.condition || 'Good'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-bold text-gray-700">Total Quantity</label>
                  <p className="mt-1 px-3 py-2 bg-gray-50 rounded">{selectedSupply.quantity || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">Available</label>
                  <p className="mt-1 px-3 py-2 bg-green-50 rounded text-green-700 font-semibold">
                    {Math.max(0, (selectedSupply.quantity || 0) - (selectedSupply.borrowedCount || 0))}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">Borrowed</label>
                  <p className="mt-1 px-3 py-2 bg-blue-50 rounded text-blue-700 font-semibold">
                    {selectedSupply.borrowedCount || 0}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">Status</label>
                <p className="mt-1">
                  <span className={`px-3 py-2 rounded inline-block ${
                    Math.max(0, (selectedSupply.quantity || 0) - (selectedSupply.borrowedCount || 0)) > 0
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {Math.max(0, (selectedSupply.quantity || 0) - (selectedSupply.borrowedCount || 0)) > 0 ? 'Available for Borrowing' : 'Out of Stock'}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  handleEdit(selectedSupply);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Edit Supply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageSupplies;
