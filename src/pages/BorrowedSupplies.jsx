import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { RefreshCw, Eye, Package } from 'lucide-react';

const BorrowedSupplies = () => {
  const [borrowedItems, setBorrowedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchBorrowedSupplies();
  }, []);

  const fetchBorrowedSupplies = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'borrowed_supplies'), orderBy('borrowedDate', 'desc'));
      const snapshot = await getDocs(q);
      
      // Fetch user details for each borrowed item
      const itemsPromises = snapshot.docs.map(async (borrowDoc) => {
        const borrowData = borrowDoc.data();
        let borrowerName = 'Unknown User';
        let borrowerEmail = '';
        
        // Fetch user details using borrowerId
        if (borrowData.borrowerId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', borrowData.borrowerId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              borrowerName = userData.displayName || userData.firstName || userData.username || 'Unknown User';
              borrowerEmail = userData.email || '';
            }
          } catch (err) {
            console.error('Error fetching user:', err);
            // If user fetch fails, try to use userId field
            borrowerName = borrowData.borrowerId;
          }
        }
        
        return {
          id: borrowDoc.id,
          ...borrowData,
          borrowerName,
          borrowerEmail
        };
      });
      
      const items = await Promise.all(itemsPromises);
      setBorrowedItems(items);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching borrowed supplies:', error);
      setLoading(false);
    }
  };

  const handleMarkReturned = async (itemId) => {
    if (window.confirm('Mark this item as returned?')) {
      try {
        // Update the borrowed record
        await updateDoc(doc(db, 'borrowed_supplies', itemId), {
          status: 'returned',
          returnedDate: new Date(),
          returnedAt: serverTimestamp()
        });

        // Also add back the quantity to the supply's availableQuantity
        const item = borrowedItems.find(i => i.id === itemId);
        if (item?.supplyId) {
          const supplyRef = doc(db, 'supplies', item.supplyId);
          const supplyDoc = await getDoc(supplyRef);
          if (supplyDoc.exists()) {
            const supplyData = supplyDoc.data();
            const returnQty = item.quantity || 1;
            const newAvailable = Math.min(
              (supplyData.availableQuantity || 0) + returnQty,
              supplyData.quantity || 0
            );
            await updateDoc(supplyRef, {
              availableQuantity: newAvailable,
              status: newAvailable > 0 ? 'available' : 'unavailable',
              updatedAt: serverTimestamp()
            });
          }
        }

        fetchBorrowedSupplies();
      } catch (error) {
        console.error('Error updating item:', error);
        alert('Failed to update item status');
      }
    }
  };

  const filteredItems = borrowedItems.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'borrowed') return item.status === 'borrowed' || !item.status;
    if (filter === 'returned') return item.status === 'returned';
    return true;
  });

  const allCount = borrowedItems.length;
  const borrowedCount = borrowedItems.filter(item => item.status === 'borrowed' || !item.status).length;
  const returnedCount = borrowedItems.filter(item => item.status === 'returned').length;

  if (loading) {
    return <div className="text-xl">Loading borrowed supplies...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Borrowed Supplies</h1>
        <p className="text-gray-600">Track and manage borrowed barangay supplies</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All ({allCount})
        </button>
        <button
          onClick={() => setFilter('borrowed')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            filter === 'borrowed'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Currently Borrowed ({borrowedCount})
        </button>
        <button
          onClick={() => setFilter('returned')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            filter === 'returned'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Returned ({returnedCount})
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">ITEM</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">BORROWER</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">QUANTITY</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">BORROWED DATE</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">RETURN BY</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">RETURNED DATE</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">STATUS</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                  No borrowed items found
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.itemName}
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                          <Package size={20} className="text-gray-500" />
                        </div>
                      )}
                      <span className="font-medium">{item.itemName || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-800">{item.borrowerName}</p>
                      {item.borrowerEmail && (
                        <p className="text-xs text-gray-500">{item.borrowerEmail}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">{item.quantity || 1}</td>
                  <td className="px-6 py-4">
                    {item.borrowedDate 
                      ? new Date(item.borrowedDate.seconds * 1000).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const rb = item.returnBy || item.returnDate;
                      if (!rb) return <span className="text-gray-400">—</span>;
                      const d = typeof rb.toDate === 'function' ? rb.toDate() : new Date(rb.seconds * 1000);
                      return isNaN(d) ? <span className="text-gray-400">—</span> : d.toLocaleDateString();
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    {item.status === 'returned' && (item.returnedDate || item.returnedAt)
                      ? (() => {
                          const d = item.returnedDate || item.returnedAt;
                          const date = typeof d.toDate === 'function'
                            ? d.toDate()
                            : d instanceof Date ? d : new Date(d.seconds * 1000);
                          return (
                            <span className="text-green-700 font-medium">
                              {date.toLocaleDateString()}
                              <span className="block text-xs text-gray-400">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </span>
                          );
                        })()
                      : <span className="text-gray-400 text-sm">—</span>
                    }
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                      item.status === 'returned'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      <span className="w-2 h-2 rounded-full ${
                        item.status === 'returned' ? 'bg-green-500' : 'bg-yellow-500'
                      }"></span>
                      {item.status === 'returned' ? 'Returned' : 'Borrowed'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                        View
                      </button>
                      {item.status !== 'returned' && (
                        <button
                          onClick={() => handleMarkReturned(item.id)}
                          className="text-green-600 hover:text-green-800 font-medium text-sm"
                        >
                          Mark Returned
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Refresh Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={fetchBorrowedSupplies}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700"
        >
          <RefreshCw size={20} />
          Refresh
        </button>
      </div>
    </div>
  );
};

export default BorrowedSupplies;
