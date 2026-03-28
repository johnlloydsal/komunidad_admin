import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { Trash2, Plus, RefreshCw, Image as ImageIcon, X } from 'lucide-react';

const ViewAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    category: 'barangay'
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      // Refresh auth token
      const currentUser = auth.currentUser;
      if (currentUser) await currentUser.getIdToken(true);
      
      // Fetch announcements sorted by newest first
      const announcementsQuery = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(announcementsQuery);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAnnouncements(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setLoading(false);
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
    if (!imageFile) return '';

    try {
      const timestamp = Date.now();
      const storageRef = ref(storage, `announcements/${timestamp}_${imageFile.name}`);
      
      await uploadBytes(storageRef, imageFile);
      const downloadURL = await getDownloadURL(storageRef);
      
      console.log('Image uploaded:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleAddAnnouncement = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);
      
      const imageUrl = await uploadImage();
      
      await addDoc(collection(db, 'announcements'), {
        ...newAnnouncement,
        imageUrl: imageUrl || '',
        createdAt: serverTimestamp()
      });
      
      setNewAnnouncement({ title: '', content: '', category: 'barangay' });
      setImageFile(null);
      setImagePreview('');
      setShowModal(false);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error adding announcement:', error);
      alert('Failed to add announcement: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this announcement?')) {
      try {
        await deleteDoc(doc(db, 'announcements', id));
        setAnnouncements(announcements.filter(a => a.id !== id));
      } catch (error) {
        console.error('Error deleting announcement:', error);
      }
    }
  };

  if (loading) return <div className="text-xl">Loading announcements...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">View Announcements</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchAnnouncements}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700"
          >
            <RefreshCw size={20} />
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700"
          >
            <Plus size={20} />
            Add Announcement
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {announcements.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-500">
            No announcements yet
          </div>
        ) : (
          announcements.map((announcement) => (
            <div key={announcement.id} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">{announcement.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs capitalize ${
                      announcement.category === 'security' ? 'bg-red-100 text-red-700' :
                      announcement.category === 'advisory' ? 'bg-yellow-100 text-yellow-700' :
                      announcement.category === 'events' ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {announcement.category}
                    </span>
                  </div>
                  
                  {announcement.imageUrl && (
                    <img 
                      src={announcement.imageUrl} 
                      alt={announcement.title}
                      className="w-full max-w-md h-48 object-cover rounded-lg mb-3"
                    />
                  )}
                  
                  <p className="text-gray-600 mb-2">{announcement.content}</p>
                  <p className="text-sm text-gray-400">
                    {announcement.createdAt?.toDate().toLocaleString() || 'N/A'}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(announcement.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Announcement Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Add New Announcement</h2>
            <form onSubmit={handleAddAnnouncement}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  required
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Content</label>
                <textarea
                  required
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg h-32"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={newAnnouncement.category}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, category: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="barangay">Barangay</option>
                  <option value="events">Events</option>
                  <option value="advisory">Advisory</option>
                  <option value="security">Security</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={18} />
                    Image (Optional)
                  </div>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                
                {imagePreview && (
                  <div className="mt-3 relative">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview('');
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setImageFile(null);
                    setImagePreview('');
                  }}
                  disabled={uploading}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewAnnouncements;
