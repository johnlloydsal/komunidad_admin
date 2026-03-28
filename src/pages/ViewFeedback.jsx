import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Star, RefreshCw, TrendingUp, MessageSquare, Trash2, X, Eye } from 'lucide-react';

const ViewFeedback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState('all');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [userBorrowedSupplies, setUserBorrowedSupplies] = useState([]);
  const [stats, setStats] = useState({
    totalFeedback: 0,
    averageRating: 0,
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });

  useEffect(() => {
    fetchFeedback();
  }, []);

  // Auto-open feedback from notification click
  useEffect(() => {
    if (location.state?.feedbackId && location.state?.timestamp && feedbacks.length > 0) {
      const feedback = feedbacks.find(f => f.id === location.state.feedbackId);
      if (feedback) {
        console.log('📬 Opening feedback details from notification:', location.state.feedbackId);
        handleViewDetails(feedback);
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, feedbacks]);

  const fetchFeedback = async () => {
    try {
      console.log('🔍 Fetching feedback from reports AND service requests...');
      
      // Fetch from reports collection
      const reportsQuery = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
      const reportsSnapshot = await getDocs(reportsQuery);
      
      // Fetch from service_requests collection
      const serviceQuery = query(collection(db, 'service_requests'), orderBy('createdAt', 'desc'));
      const serviceSnapshot = await getDocs(serviceQuery);
      
      console.log('📦 Reports snapshot size:', reportsSnapshot.size);
      console.log('📦 Service requests snapshot size:', serviceSnapshot.size);
      
      // Process reports with ratings
      const reportData = await Promise.all(reportsSnapshot.docs
        .filter(doc => {
          const rating = doc.data().rating;
          return rating && rating > 0;
        })
        .map(async (docSnap) => {
          const docData = docSnap.data();
          
          // Fetch user data to get accurate user name
          let userName = docData.userName || docData.reporterName || 'Anonymous';
          let userEmail = docData.userEmail || docData.email || '';
          const userId = docData.userId || docData.uid;
          
          if (userId && userName === 'Anonymous') {
            try {
              const userDoc = await getDoc(doc(db, 'users', userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                userName = 
                  userData.displayName || 
                  userData.name ||
                  (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}`.trim() : null) ||
                  userData.firstName ||
                  userData.username ||
                  userData.email?.split('@')[0] ||
                  'Anonymous';
                userEmail = userData.email || '';
              }
            } catch (err) {
              console.error('Error fetching user for feedback:', err);
            }
          }
          
          return {
            id: docSnap.id,
            ...docData,
            userName,
            userEmail,
            comment: docData.feedbackComment || docData.resolutionFeedback || 'No comment',
            imageUrl: docData.imageUrl || (docData.mediaUrls && docData.mediaUrls[0]) || null,
            relatedReportTitle: docData.title || docData.category,
            feedbackType: 'Report Feedback'
          };
        }));
      
      // Process service requests with ratings
      const serviceData = await Promise.all(serviceSnapshot.docs
        .filter(doc => {
          const rating = doc.data().rating;
          return rating && rating > 0;
        })
        .map(async (docSnap) => {
          const docData = docSnap.data();
          
          // Fetch user data
          let userName = docData.requestedBy || docData.userName || 'Anonymous';
          let userEmail = docData.userEmail || docData.email || '';
          const userId = docData.userId || docData.uid;
          
          if (userId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                userName = 
                  userData.displayName || 
                  userData.name ||
                  (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}`.trim() : null) ||
                  userData.firstName ||
                  userData.username ||
                  userData.email?.split('@')[0] ||
                  'Anonymous';
                userEmail = userData.email || '';
              }
            } catch (err) {
              console.error('Error fetching user for service feedback:', err);
            }
          }
          
          return {
            id: docSnap.id,
            ...docData,
            userName,
            userEmail,
            comment: docData.feedbackComment || docData.resolutionFeedback || 'No comment',
            imageUrl: docData.imageUrl || null,
            relatedReportTitle: docData.serviceType || docData.type || docData.category || 'Service Request',
            feedbackType: 'Service Feedback'
          };
        }));
      
      // Fetch from lost_items collection with ratings
      const lostQuery = query(collection(db, 'lost_items'), orderBy('createdAt', 'desc'));
      const lostSnapshot = await getDocs(lostQuery);
      console.log('📦 Lost items snapshot size:', lostSnapshot.size);

      const lostData = await Promise.all(lostSnapshot.docs
        .filter(doc => {
          const rating = doc.data().rating;
          return rating && rating > 0;
        })
        .map(async (docSnap) => {
          const docData = docSnap.data();

          let userName = docData.reporterName || docData.userName || docData.name || 'Anonymous';
          let userEmail = docData.reporterEmail || docData.userEmail || docData.email || '';
          const userId = docData.userId || docData.reporterId || docData.uid;

          if (userId && userName === 'Anonymous') {
            try {
              const userDoc = await getDoc(doc(db, 'users', userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                userName =
                  userData.displayName ||
                  userData.name ||
                  (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}`.trim() : null) ||
                  userData.firstName ||
                  userData.username ||
                  userData.email?.split('@')[0] ||
                  'Anonymous';
                userEmail = userData.email || '';
              }
            } catch (err) {
              console.error('Error fetching user for lost item feedback:', err);
            }
          }

          return {
            id: docSnap.id,
            ...docData,
            userName,
            userEmail,
            comment: docData.ratingComment || docData.feedbackComment || docData.resolutionFeedback || 'No comment',
            relatedReportTitle: docData.itemName || 'Lost Item',
            feedbackType: 'Lost & Found Feedback',
            location: docData.location || docData.zone || ''
          };
        }));

      console.log('📄 Lost items with ratings:', lostData.length);

      // Combine all arrays
      const data = [...reportData, ...serviceData, ...lostData];
      
      console.log('📄 Reports with ratings:', reportData.length);
      console.log('📄 Service requests with ratings:', serviceData.length);
      data.forEach(item => {
        console.log('⭐ Rating:', item.rating, 'Type:', item.feedbackType, 'User:', item.userName, 'Comment:', item.comment);
      });
      
      console.log('✅ Total fetched:', data.length);
      
      // Remove duplicates
      const uniqueData = [];
      const seen = new Set();
      
      data.forEach(feedback => {
        const key = `${feedback.userId}_${feedback.rating}_${feedback.comment}_${feedback.createdAt?.seconds}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueData.push(feedback);
        }
      });
      
      console.log('✅ Unique feedback:', uniqueData.length);
      
      // Sort by newest first (by ratedAt or updatedAt or createdAt)
      const sortedData = uniqueData.sort((a, b) => {
        const aTime = a.ratedAt?.toDate?.() || a.updatedAt?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.ratedAt?.toDate?.() || b.updatedAt?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
        return bTime - aTime; // Newest first
      });
      
      console.log('✅ Sorted feedback (newest first):', sortedData.length);
      
      // Calculate statistics
      const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      let totalRating = 0;
      
      sortedData.forEach(feedback => {
        const rating = feedback.rating || 0;
        if (rating >= 1 && rating <= 5) {
          ratingBreakdown[rating]++;
          totalRating += rating;
        }
      });
      
      const averageRating = sortedData.length > 0 ? totalRating / sortedData.length : 0;
      
      setStats({
        totalFeedback: sortedData.length,
        averageRating,
        ratingBreakdown
      });
      
      setFeedbacks(sortedData);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching feedback:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      alert(`Error loading feedback: ${error.message}\n\nCheck browser console (F12) for details`);
      setLoading(false);
    }
  };

  // Fetch borrowed supplies for a specific user (for Funeral & Bereavement Assistance)
  const fetchUserBorrowedSupplies = async (userId) => {
    try {
      console.log('🔍 Fetching borrowed supplies for user:', userId);
      const borrowedQuery = query(collection(db, 'borrowed_supplies'));
      const snapshot = await getDocs(borrowedQuery);
      
      const userSupplies = await Promise.all(
        snapshot.docs
          .filter(doc => doc.data().borrowerId === userId || doc.data().userId === userId)
          .map(async (docSnap) => {
            const data = docSnap.data();
            
            // Fetch supply details
            let supplyName = data.supplyName || data.itemName || 'Unknown Item';
            if (data.supplyId) {
              try {
                const supplyDoc = await getDoc(doc(db, 'supplies', data.supplyId));
                if (supplyDoc.exists()) {
                  supplyName = supplyDoc.data().itemName || supplyName;
                }
              } catch (err) {
                console.error('Error fetching supply details:', err);
              }
            }
            
            return {
              id: docSnap.id,
              supplyName,
              quantity: data.quantity || 1,
              borrowedAt: data.borrowedAt?.toDate ? data.borrowedAt.toDate() : new Date(),
              status: data.status || 'borrowed'
            };
          })
      );
      
      console.log('📦 User borrowed supplies:', userSupplies.length);
      setUserBorrowedSupplies(userSupplies);
    } catch (error) {
      console.error('Error fetching user borrowed supplies:', error);
      setUserBorrowedSupplies([]);
    }
  };

  const handleViewDetails = (feedback) => {
    setSelectedFeedback(feedback);
    setShowDetailsModal(true);
    
    // If this is Funeral & Bereavement Assistance, fetch borrowed supplies
    const isFuneralService = 
      feedback.relatedReportTitle?.toLowerCase().includes('funeral') ||
      feedback.relatedReportTitle?.toLowerCase().includes('bereavement') ||
      feedback.serviceType?.toLowerCase().includes('funeral') ||
      feedback.serviceType?.toLowerCase().includes('bereavement') ||
      feedback.category?.toLowerCase().includes('funeral') ||
      feedback.category?.toLowerCase().includes('bereavement');
    
    if (isFuneralService && feedback.userId) {
      fetchUserBorrowedSupplies(feedback.userId);
    } else {
      setUserBorrowedSupplies([]);
    }
  };

  const handleDelete = async (feedbackId) => {
    if (!window.confirm('Are you sure you want to delete this rating? This will remove the rating from the record.')) {
      return;
    }

    try {
      // Find the feedback to determine which collection it belongs to
      const feedback = feedbacks.find(f => f.id === feedbackId);
      if (!feedback) {
        alert('Feedback not found.');
        return;
      }

      // Determine the collection based on feedbackType
      const collectionName =
        feedback.feedbackType === 'Service Feedback' ? 'service_requests' :
        feedback.feedbackType === 'Lost & Found Feedback' ? 'lost_items' : 'reports';
      
      console.log(`🗑️ Deleting feedback from ${collectionName} collection, ID: ${feedbackId}`);

      // Update the document to remove the rating fields
      await updateDoc(doc(db, collectionName, feedbackId), {
        rating: null,
        feedbackComment: null,
        ratingComment: null,
        ratedAt: null,
        resolutionFeedback: null
      });

      // Remove from local state
      const updatedFeedbacks = feedbacks.filter(f => f.id !== feedbackId);
      setFeedbacks(updatedFeedbacks);
      
      // Recalculate stats
      const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      let totalRating = 0;
      
      updatedFeedbacks.forEach(feedback => {
        const rating = feedback.rating || 0;
        if (rating >= 1 && rating <= 5) {
          ratingBreakdown[rating]++;
          totalRating += rating;
        }
      });
      
      const averageRating = updatedFeedbacks.length > 0 ? totalRating / updatedFeedbacks.length : 0;
      
      setStats({
        totalFeedback: updatedFeedbacks.length,
        averageRating,
        ratingBreakdown
      });

      // Close modal if it's open
      setShowDetailsModal(false);
      setSelectedFeedback(null);
      
      alert('✅ Feedback deleted successfully!');
      console.log('✅ Feedback deleted from Firebase and UI updated');
    } catch (error) {
      console.error('❌ Error deleting feedback:', error);
      alert('Failed to delete feedback. Please try again.');
    }
  };

  const renderStars = (rating) => {
    return Array(5).fill(0).map((_, i) => (
      <Star
        key={i}
        size={18}
        className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
      />
    ));
  };
  
  const filteredFeedbacks = filterRating === 'all' 
    ? feedbacks 
    : feedbacks.filter(f => f.rating === parseInt(filterRating));

  if (loading) return <div className="text-xl">Loading feedback...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">View Feedback</h1>
          <p className="text-gray-600 mt-1">User ratings and comments from mobile app</p>
        </div>
        <button
          onClick={fetchFeedback}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
        >
          <RefreshCw size={20} />
          Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm mb-1">Total Feedback</p>
              <p className="text-3xl font-bold">{stats.totalFeedback}</p>
            </div>
            <MessageSquare size={40} className="opacity-80" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm mb-1">Average Rating</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold">{stats.averageRating.toFixed(1)}</p>
                <Star size={24} className="fill-white" />
              </div>
            </div>
            <TrendingUp size={40} className="opacity-80" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200">
          <p className="text-gray-600 text-sm mb-3 font-semibold">Rating Distribution</p>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(rating => {
              const count = stats.ratingBreakdown[rating];
              const percentage = stats.totalFeedback > 0 
                ? (count / stats.totalFeedback) * 100 
                : 0;
              
              return (
                <div key={rating} className="flex items-center gap-2">
                  <div className="flex items-center gap-1 w-16">
                    <span className="text-sm font-semibold">{rating}</span>
                    <Star size={14} className="fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={filterRating}
          onChange={(e) => setFilterRating(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
        >
          <option value="all">All Ratings ({stats.totalFeedback})</option>
          <option value="5">5 Stars ({stats.ratingBreakdown[5]})</option>
          <option value="4">4 Stars ({stats.ratingBreakdown[4]})</option>
          <option value="3">3 Stars ({stats.ratingBreakdown[3]})</option>
          <option value="2">2 Stars ({stats.ratingBreakdown[2]})</option>
          <option value="1">1 Star ({stats.ratingBreakdown[1]})</option>
        </select>
      </div>

      {/* Feedback List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredFeedbacks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-500">
            {filterRating === 'all' 
              ? 'No feedback yet. Users can submit feedback from the mobile app.' 
              : `No ${filterRating}-star feedback yet.`}
          </div>
        ) : (
          filteredFeedbacks.map((feedback) => (
            <div key={feedback.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-700 font-bold text-lg">
                        {(feedback.userName || 'A').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{feedback.userName || 'Anonymous'}</h3>
                      <p className="text-sm text-gray-500">
                        {feedback.userEmail || 'No email'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    📅 {feedback.createdAt?.toDate().toLocaleString() || 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {renderStars(feedback.rating || 0)}
                  </div>
                  <button                    onClick={() => handleViewDetails(feedback)}
                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition"
                    title="View details"
                  >
                    <Eye size={18} />
                  </button>
                  <button                    onClick={() => handleDelete(feedback.id)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition"
                    title="Delete feedback"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-3">
                <p className="text-gray-700 leading-relaxed">
                  {feedback.comment || 'No comment provided'}
                </p>
              </div>
              
              {/* Display image if exists */}
              {feedback.imageUrl && (
                <div className="mb-3">
                  <img 
                    src={feedback.imageUrl} 
                    alt="Feedback attachment" 
                    className="rounded-lg max-h-96 w-full object-contain border border-gray-200 bg-gray-50"
                    loading="lazy"
                    onLoad={() => {
                      console.log('✅ Feedback image loaded successfully:', feedback.imageUrl);
                    }}
                    onError={(e) => {
                      console.error('❌ Failed to load feedback image:', feedback.imageUrl);
                      console.error('❌ Image error event:', e);
                      e.target.parentElement.innerHTML = '<div class="p-4 bg-gray-100 rounded-lg text-gray-500 text-center">Image not available</div>';
                    }}
                  />
                </div>
              )}

              {/* Report Title if exists */}
              {feedback.relatedReportTitle && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600">
                    📄 Related to: <span className="font-semibold">{feedback.relatedReportTitle}</span>
                  </p>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  feedback.feedbackType === 'Lost & Found Feedback'
                    ? 'bg-amber-100 text-amber-700'
                    : feedback.feedbackType === 'Service Feedback'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {feedback.feedbackType === 'Lost & Found Feedback' ? '🔍 Lost & Found' :
                   feedback.feedbackType === 'Service Feedback' ? '🛎️ Service' : '📋 Report'}
                </span>
                {feedback.category && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                    {feedback.category}
                  </span>
                )}
                {feedback.rating >= 4 && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    👍 Positive
                  </span>
                )}
                {feedback.rating <= 2 && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                    ⚠️ Needs Attention
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Feedback Details Modal */}
      {showDetailsModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-3 border-b z-10">
              <h2 className="text-xl font-bold text-gray-800">⭐ Feedback Details</h2>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-500 hover:text-gray-700 p-2 rounded-full">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* User Info */}
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">
                      {(selectedFeedback.userName || 'A').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{selectedFeedback.userName || 'Anonymous'}</h3>
                    <p className="text-sm text-gray-600">{selectedFeedback.userEmail || 'No email'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">Rating:</span>
                  <div className="flex gap-1">
                    {renderStars(selectedFeedback.rating || 0)}
                  </div>
                  <span className="text-lg font-bold text-purple-700">({selectedFeedback.rating}/5)</span>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="text-sm font-bold text-gray-700">Date Submitted</label>
                <p className="mt-1 px-3 py-2 bg-gray-50 rounded">
                  {selectedFeedback.createdAt?.toDate().toLocaleString() || 'N/A'}
                </p>
              </div>

              {/* Comment */}
              <div>
                <label className="text-sm font-bold text-gray-700">Feedback Comment</label>
                <p className="mt-1 px-3 py-2 bg-gray-50 rounded min-h-[80px]">
                  {selectedFeedback.comment || 'No comment provided'}
                </p>
              </div>

              {/* Related Report */}
              {selectedFeedback.relatedReportTitle && (
                <div>
                  <label className="text-sm font-bold text-gray-700">Related Report</label>
                  <p className="mt-1 px-3 py-2 bg-blue-50 rounded">
                    📄 {selectedFeedback.relatedReportTitle}
                  </p>
                </div>
              )}

              {/* Category */}
              {selectedFeedback.category && (
                <div>
                  <label className="text-sm font-bold text-gray-700">Category</label>
                  <p className="mt-1 px-3 py-2 bg-purple-50 rounded">
                    {selectedFeedback.category}
                  </p>
                </div>
              )}

              {/* Borrowed Supplies (Only for Funeral & Bereavement Assistance) */}
              {userBorrowedSupplies.length > 0 && (
                <div>
                  <label className="text-sm font-bold text-gray-700">Barangay Supplies Borrowed</label>
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-semibold text-blue-800 mb-2">
                      📦 Total Items Borrowed: {userBorrowedSupplies.length}
                    </p>
                    <ul className="space-y-2">
                      {userBorrowedSupplies.map((supply, idx) => (
                        <li key={supply.id} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-blue-100">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600 font-medium">{idx + 1}.</span>
                            <span className="text-gray-800">{supply.supplyName}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600">Qty: {supply.quantity}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              supply.status === 'returned' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {supply.status === 'returned' ? '✓ Returned' : 'Borrowed'}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Image */}
              {selectedFeedback.imageUrl && (
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block">Attached Image</label>
                  <img 
                    src={selectedFeedback.imageUrl} 
                    alt="Feedback attachment" 
                    className="rounded-lg w-full object-contain border border-gray-200 bg-gray-50 max-h-96"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Sentiment Badge */}
              <div className="flex gap-2">
                {selectedFeedback.rating >= 4 && (
                  <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">
                    👍 Positive Feedback
                  </span>
                )}
                {selectedFeedback.rating === 3 && (
                  <span className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-medium">
                    😐 Neutral Feedback
                  </span>
                )}
                {selectedFeedback.rating <= 2 && (
                  <span className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium">
                    ⚠️ Needs Attention
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6 pt-4 border-t">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleDelete(selectedFeedback.id);
                  setShowDetailsModal(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewFeedback;
