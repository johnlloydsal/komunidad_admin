import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc,
  orderBy,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { CheckCircle, XCircle, Clock, Package } from 'lucide-react';

function ViewBorrowedSupplies() {
  const [borrowedItems, setBorrowedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, borrowed, returned
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetchBorrowedItems();
  }, []);

  const fetchBorrowedItems = async () => {
    try {
      const borrowedRef = collection(db, 'borrowed_supplies');
      const q = query(borrowedRef, orderBy('borrowedAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const items = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        console.log('Borrowed item data:', data); // Debug log
        
        // Fetch supply details
        let supplyName = data.supplyName || data.itemName || 'Unknown Item';
        let supplyImage = data.supplyImage || data.imageUrl || '';
        
        if (data.supplyId) {
          try {
            const supplyDoc = await getDoc(doc(db, 'supplies', data.supplyId));
            if (supplyDoc.exists()) {
              supplyName = supplyDoc.data().itemName || supplyName;
              supplyImage = supplyDoc.data().imageUrl || supplyImage;
            }
          } catch (err) {
            console.error('Error fetching supply details:', err);
          }
        }
        
        // Fetch user (borrower) details - check multiple possible field names
        let borrowerName = 'Unknown User';
        let borrowerEmail = '';
        const borrowerId = data.borrowerId || data.userId || data.borrower;
        
        console.log('Borrower ID:', borrowerId); // Debug log
        
        if (borrowerId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', borrowerId));
            console.log('User doc exists:', userDoc.exists()); // Debug log
            if (userDoc.exists()) {
              const userData = userDoc.data();
              console.log('User data:', userData); // Debug log
              borrowerName = userData.displayName || userData.firstName || userData.username || userData.email || borrowerId;
              borrowerEmail = userData.email || '';
            } else {
              console.log('User document not found for ID:', borrowerId);
              borrowerName = borrowerId;
            }
          } catch (err) {
            console.error('Error fetching user details:', err);
            borrowerName = borrowerId;
          }
        } else {
          console.log('No borrower ID found in data');
        }
        
        console.log('Final borrower name:', borrowerName); // Debug log
        
        return {
          id: docSnap.id,
          ...data,
          supplyName,
          supplyImage,
          borrowerName,
          borrowerEmail,
          borrowedAt: data.borrowedAt?.toDate ? data.borrowedAt.toDate() : new Date(data.borrowedAt),
          returnBy: data.returnBy?.toDate ? data.returnBy.toDate() : new Date(data.returnBy),
          returnedAt: data.returnedAt?.toDate ? data.returnedAt.toDate() : data.returnedAt ? new Date(data.returnedAt) : null
        };
      }));
      
      setBorrowedItems(items);
      console.log('Fetched borrowed items with names:', items);
    } catch (error) {
      console.error('Error fetching borrowed items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsReturned = async (item) => {
    try {
      const borrowedRef = doc(db, 'borrowed_supplies', item.id);
      const supplyRef = doc(db, 'supplies', item.supplyId);
      
      // Update borrowed item status
      await updateDoc(borrowedRef, {
        status: 'returned',
        returnedAt: new Date()
      });
      
      // Increment available quantity in supplies
      const supplyDoc = await getDoc(supplyRef);
      if (supplyDoc.exists()) {
        const currentAvailable = supplyDoc.data().availableQuantity || 0;
        const newAvailable = currentAvailable + item.quantity;
        
        await updateDoc(supplyRef, {
          availableQuantity: newAvailable,
          status: newAvailable > 0 ? 'available' : 'unavailable'
        });
      }
      
      alert('Item marked as returned successfully!');
      fetchBorrowedItems();
      setSelectedItem(null);
    } catch (error) {
      console.error('Error marking as returned:', error);
      alert('Failed to mark item as returned');
    }
  };

  const filteredItems = borrowedItems.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const isOverdue = (item) => {
    if (item.status === 'returned') return false;
    return new Date() > item.returnBy;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading borrowed supplies...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Borrowed Supplies</h1>
        <p className="text-gray-600">Track and manage borrowed barangay supplies</p>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All ({borrowedItems.length})
        </button>
        <button
          onClick={() => setFilter('borrowed')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'borrowed'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Currently Borrowed ({borrowedItems.filter(i => i.status === 'borrowed').length})
        </button>
        <button
          onClick={() => setFilter('returned')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'returned'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Returned ({borrowedItems.filter(i => i.status === 'returned').length})
        </button>
      </div>

      {/* Borrowed Items Table */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">No borrowed supplies found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Borrower
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Borrowed Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Return By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {item.supplyImage && (
                          <img
                            src={item.supplyImage}
                            alt={item.supplyName}
                            className="w-12 h-12 rounded object-cover mr-3"
                          />
                        )}
                        <span className="font-medium text-gray-900">{item.supplyName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <p className="font-medium">{item.borrowerName}</p>
                        {item.borrowerEmail && (
                          <p className="text-xs text-gray-500">{item.borrowerEmail}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.borrowedAt.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={isOverdue(item) ? 'text-red-600 font-medium' : 'text-gray-600'}>
                        {item.returnBy.toLocaleDateString()}
                        {isOverdue(item) && ' (Overdue)'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.status === 'borrowed' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Clock className="w-3 h-3 mr-1" />
                          Borrowed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Returned
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View
                        </button>
                        {item.status === 'borrowed' && (
                          <button
                            onClick={() => handleMarkAsReturned(item)}
                            className="text-green-600 hover:text-green-800"
                          >
                            Mark Returned
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Borrowed Item Details</h2>
              
              {selectedItem.supplyImage && (
                <img
                  src={selectedItem.supplyImage}
                  alt={selectedItem.supplyName}
                  className="w-full h-64 object-cover rounded-lg mb-4"
                />
              )}
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Item Name</label>
                  <p className="text-gray-900">{selectedItem.supplyName}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Borrower</label>
                  <p className="text-gray-900">{selectedItem.userName || selectedItem.userId}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity Borrowed</label>
                  <p className="text-gray-900">{selectedItem.quantity}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Borrowed Date</label>
                  <p className="text-gray-900">{selectedItem.borrowedAt.toLocaleString()}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Expected Return Date</label>
                  <p className={isOverdue(selectedItem) ? 'text-red-600 font-medium' : 'text-gray-900'}>
                    {selectedItem.returnBy.toLocaleString()}
                    {isOverdue(selectedItem) && ' (OVERDUE)'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="text-gray-900 capitalize">{selectedItem.status}</p>
                </div>
                
                {selectedItem.returnedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Returned Date</label>
                    <p className="text-gray-900">{selectedItem.returnedAt.toLocaleString()}</p>
                  </div>
                )}
                
                {selectedItem.purpose && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Purpose</label>
                    <p className="text-gray-900">{selectedItem.purpose}</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 mt-6">
                {selectedItem.status === 'borrowed' && (
                  <button
                    onClick={() => handleMarkAsReturned(selectedItem)}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Mark as Returned
                  </button>
                )}
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

export default ViewBorrowedSupplies;
