import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, getDocs, getDoc, query, orderBy, where, deleteDoc, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Trash2, Eye, Filter, RefreshCw, CheckCircle, X, ClipboardList, FileText, XCircle, Clock, AlertCircle, Package, Edit } from 'lucide-react';

const SERVICE_TYPES = [
  'Barangay Clearance',
  'Certificate of Residency',
  'Certificate of Indigency',
  'Business Permit',
  'Complaint / Blotter',
  'Medical Assistance',
  'Financial Assistance',
  'Infrastructure Request',
  'Other Service'
];

const ViewReports = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const processedStateRef = useRef(null);
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' or 'service_requests'
  const [serviceSubTab, setServiceSubTab] = useState('requests'); // 'requests' or 'borrowed'
  const [reports, setReports] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [borrowedItems, setBorrowedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [suppliesFilter, setSuppliesFilter] = useState('all'); // 'all', 'pending', 'borrowed', 'returned'
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedBorrowedItem, setSelectedBorrowedItem] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showReportActionModal, setShowReportActionModal] = useState(false);
  const [showBorrowedDetailsModal, setShowBorrowedDetailsModal] = useState(false);
  const [showBorrowActionModal, setShowBorrowActionModal] = useState(false);
  const [borrowActionType, setBorrowActionType] = useState(''); // 'approve', 'reject', 'complete'
  const [borrowAdminNotes, setBorrowAdminNotes] = useState('');
  const [actionType, setActionType] = useState(''); // 'approve', 'complete', 'reject'
  const [reportActionType, setReportActionType] = useState(''); // 'action', 'complete', 'reject'
  const [adminNotes, setAdminNotes] = useState('');
  const [resolutionFeedback, setResolutionFeedback] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchReports(),
          fetchServiceRequests(),
          fetchBorrowedItems()
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Auto-open items from notification click
  useEffect(() => {
    // Create a unique key including timestamp to detect new navigation
    const stateKey = JSON.stringify({
      reportId: location.state?.reportId,
      serviceRequestId: location.state?.serviceRequestId,
      borrowedItemId: location.state?.borrowedItemId,
      borrowerId: location.state?.borrowerId,
      timestamp: location.state?.timestamp
    });

    // Skip if we've already processed this exact state (including timestamp)
    if (processedStateRef.current === stateKey) {
      return;
    }

    console.log('📍 ViewReports location.state:', location.state);
    console.log('📊 Data available - Reports:', reports.length, 'Services:', serviceRequests.length, 'Borrowed:', borrowedItems.length);

    // Set active tab from location state if specified
    if (location.state?.activeTab) {
      console.log('📌 Setting activeTab to:', location.state.activeTab);
      setActiveTab(location.state.activeTab);
      if (location.state.activeTab === 'service_requests' && location.state.serviceSubTab) {
        setServiceSubTab(location.state.serviceSubTab);
      }
    }

    // Auto-open report
    if (location.state?.reportId && reports.length > 0) {
      console.log('🔍 Looking for report ID:', location.state.reportId);
      const report = reports.find(r => r.id === location.state.reportId);
      if (report) {
        console.log('✅ Report found, opening details:', report);
        setSelectedReport(report);
        setShowDetailsModal(true);
        processedStateRef.current = stateKey;
        // Clear navigation state after modal opens
        setTimeout(() => {
          navigate(location.pathname, { replace: true, state: {} });
        }, 100);
      } else {
        console.log('❌ Report not found in list');
      }
    }

    // Auto-open service request
    if (location.state?.serviceRequestId && serviceRequests.length > 0) {
      console.log('🔍 Looking for service request ID:', location.state.serviceRequestId);
      const request = serviceRequests.find(r => r.id === location.state.serviceRequestId);
      if (request) {
        console.log('✅ Service request found, opening details:', request);
        setActiveTab('service_requests');
        setServiceSubTab('requests');
        setSelectedRequest(request);
        setShowRequestModal(true);
        processedStateRef.current = stateKey;
        // Clear navigation state after modal opens
        setTimeout(() => {
          navigate(location.pathname, { replace: true });
        }, 100);
      } else {
        console.log('❌ Service request not found in list');
      }
    }

    // Auto-open borrower's items (from notification)
    if (location.state?.borrowerId && borrowedItems.length > 0) {
      console.log('🔍 Looking for borrower ID:', location.state.borrowerId);
      
      // Group items by this borrower
      const borrowerItems = borrowedItems.filter(item => 
        (item.borrowerId || item.userId || 'unknown') === location.state.borrowerId
      );
      
      if (borrowerItems.length > 0) {
        console.log('✅ Found', borrowerItems.length, 'items for borrower');
        
        // Check if borrower has a service request
        const borrowerServiceRequest = serviceRequests.find(req => 
          (req.userId || req.requestedBy) === location.state.borrowerId
        );
        
        setActiveTab('service_requests');
        setServiceSubTab('borrowed');
        
        if (borrowerServiceRequest) {
          // If they have a service request, show that (it will display borrowed items too)
          console.log('✅ Found service request for borrower, opening that');
          setSelectedRequest(borrowerServiceRequest);
          setShowRequestModal(true);
        } else {
          // Otherwise, show just the borrowed items
          console.log('📦 No service request, showing borrowed items only');
          const borrowerData = {
            borrowerId: location.state.borrowerId,
            borrowerName: location.state.borrowerName || borrowerItems[0].borrowerName,
            borrowerEmail: borrowerItems[0].borrowerEmail,
            items: borrowerItems,
            totalItems: borrowerItems.length,
            statuses: {
              pending: borrowerItems.filter(i => i.status === 'pending').length,
              borrowed: borrowerItems.filter(i => i.status === 'borrowed').length,
              returned: borrowerItems.filter(i => i.status === 'returned').length
            },
            borrowedAt: borrowerItems[0].borrowedAt,
            returnBy: borrowerItems[0].returnBy
          };
          
          setSelectedBorrowedItem(borrowerData);
          setShowBorrowedDetailsModal(true);
        }
        
        processedStateRef.current = stateKey;
        
        // Clear navigation state after modal opens
        setTimeout(() => {
          navigate(location.pathname, { replace: true });
        }, 100);
      } else {
        console.log('❌ No borrowed items found for this borrower');
      }
    }

    // Auto-open borrowed item (single item - for backward compatibility)
    if (location.state?.borrowedItemId && borrowedItems.length > 0 && !location.state?.borrowerId) {
      console.log('🔍 Looking for borrowed item ID:', location.state.borrowedItemId);
      const item = borrowedItems.find(i => i.id === location.state.borrowedItemId);
      if (item) {
        console.log('✅ Borrowed item found, opening details:', item);
        setActiveTab('service_requests');
        setServiceSubTab('borrowed');
        setSelectedBorrowedItem(item);
        setShowBorrowedDetailsModal(true);
        processedStateRef.current = stateKey;
        // Clear navigation state after modal opens
        setTimeout(() => {
          navigate(location.pathname, { replace: true });
        }, 100);
      } else {
        console.log('❌ Borrowed item not found in list');
      }
    }
  }, [location.state?.reportId, location.state?.serviceRequestId, location.state?.borrowedItemId, location.state?.borrowerId, reports, serviceRequests, borrowedItems]);

  const fetchReports = async () => {
    try {
      // Refresh auth token
      const currentUser = auth.currentUser;
      if (currentUser) await currentUser.getIdToken(true);
      
      const reportsQuery = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(reportsQuery);
      
      // Fetch reports with user information
      const reportsData = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const docData = docSnap.data();
        
        // Consolidate all possible image field names
        let imageUrl = docData.imageUrl || docData.mediaUrl || docData.image || docData.photoURL;
        let mediaUrls = docData.mediaUrls || [];
        
        // If we have an array of media but it's empty, try other fields
        if (mediaUrls.length === 0) {
          if (docData.images && Array.isArray(docData.images)) {
            mediaUrls = docData.images;
          } else if (docData.attachments && Array.isArray(docData.attachments)) {
            mediaUrls = docData.attachments;
          } else if (imageUrl) {
            mediaUrls = [imageUrl];
          }
        }
        
        // Set imageUrl to first image if not already set
        if (!imageUrl && mediaUrls.length > 0) {
          imageUrl = mediaUrls[0];
        }
        
        // Fetch user data to get reporter name
        let reporterName = docData.reporterName || docData.userName || 'Unknown';
        let reporterEmail = docData.userEmail || docData.email || '';
        const userId = docData.userId || docData.uid;
        
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
            console.error('Error fetching user for report:', err);
          }
        }
        
        return { 
          id: docSnap.id, 
          ...docData, 
          imageUrl,
          mediaUrls,
          reporterName,
          reporterEmail
        };
      }));
      
      console.log('Fetched reports with user names:', reportsData.filter(r => r.reporterName !== 'Unknown').length);
      setReports(reportsData);
    } catch (error) {
      console.error('❌ Error fetching reports:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceRequests = async () => {
    try {
      // Refresh auth token
      const currentUser = auth.currentUser;
      if (currentUser) await currentUser.getIdToken(true);
      
      const q = query(collection(db, 'service_requests'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = await Promise.all(snapshot.docs.map(async (d) => {
        const docData = d.data();
        let resolvedName = docData.requestedBy || docData.userName || docData.displayName || docData.name || 'Unknown User';
        let resolvedEmail = docData.userEmail || docData.email || '';
        
        // Always look up user by userId for accurate name resolution
        const userId = docData.userId || docData.uid;
        if (userId) {
          try {
            const userSnap = await getDoc(doc(db, 'users', userId));
            if (userSnap.exists()) {
              const u = userSnap.data();
              resolvedName = 
                u.displayName || 
                u.name ||
                (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}`.trim() : null) ||
                u.firstName ||
                u.username ||
                u.email?.split('@')[0] ||
                resolvedName;
              resolvedEmail = u.email || resolvedEmail;
            }
          } catch (err) {
            console.error('Error fetching user for service request:', err);
          }
        }
        return {
          id: d.id,
          ...docData,
          resolvedName,
          resolvedEmail,
          serviceType: docData.serviceType || docData.type || docData.category || docData.requestType || '',
        };
      }));
      console.log('✅ Service requests loaded:', data.length);
      setServiceRequests(data);
    } catch (error) {
      console.error('❌ Error fetching service requests:', error);
      setServiceRequests([]);
    }
  };

  const fetchBorrowedItems = async () => {
    try {
      // Refresh auth token
      const currentUser = auth.currentUser;
      if (currentUser) await currentUser.getIdToken(true);
      
      const borrowedRef = collection(db, 'borrowed_supplies');
      const q = query(borrowedRef, orderBy('borrowedAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const items = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        
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
        
        // Fetch user (borrower) details
        let borrowerName = 'Unknown User';
        let borrowerEmail = '';
        const borrowerId = data.borrowerId || data.userId || data.borrower;
        
        if (borrowerId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', borrowerId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              borrowerName = userData.displayName || userData.firstName || userData.username || userData.email || borrowerId;
              borrowerEmail = userData.email || '';
            } else {
              borrowerName = borrowerId;
            }
          } catch (err) {
            console.error('Error fetching user details:', err);
            borrowerName = borrowerId;
          }
        }
        
        return {
          id: docSnap.id,
          ...data,
          supplyName,
          supplyImage,
          borrowerName,
          borrowerEmail,
          borrowedAt: data.borrowedAt?.toDate ? data.borrowedAt.toDate() : new Date(data.borrowedAt),
          returnBy: data.returnBy ? (data.returnBy?.toDate ? data.returnBy.toDate() : new Date(data.returnBy)) : null,
          returnedAt: data.returnedAt?.toDate ? data.returnedAt.toDate() : data.returnedAt ? new Date(data.returnedAt) : null
        };
      }));
      
      console.log('✅ Borrowed items loaded:', items.length);
      setBorrowedItems(items);
    } catch (error) {
      console.error('❌ Error fetching borrowed items:', error);
      setBorrowedItems([]);
    }
  };

  const handleDelete = async (reportId) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      try {
        await deleteDoc(doc(db, 'reports', reportId));
        setReports(reports.filter(report => report.id !== reportId));
      } catch (error) {
        console.error('Error deleting report:', error);
      }
    }
  };

  const handleDeleteRequest = async (id) => {
    if (window.confirm('Delete this service request? This will also delete all associated borrowed items and restore inventory.')) {
      try {
        // First, get the service request to find the userId
        const requestDoc = await getDoc(doc(db, 'service_requests', id));
        if (!requestDoc.exists()) {
          alert('Service request not found');
          return;
        }
        
        const requestData = requestDoc.data();
        const userId = requestData.userId || requestData.uid || requestData.requestedBy;
        
        console.log('🗑️ Deleting service request and associated items for user:', userId);
        
        // Find all borrowed items associated with this service request
        // Check both by serviceRequestId and by userId/borrowerId
        const borrowedItemsToDelete = [];
        
        // Query by serviceRequestId
        try {
          const byServiceRequestQuery = query(
            collection(db, 'borrowed_supplies'),
            where('serviceRequestId', '==', id)
          );
          const byServiceRequestSnapshot = await getDocs(byServiceRequestQuery);
          byServiceRequestSnapshot.docs.forEach(doc => {
            if (!borrowedItemsToDelete.find(item => item.id === doc.id)) {
              borrowedItemsToDelete.push(doc);
            }
          });
        } catch (err) {
          console.log('No items found by serviceRequestId:', err.message);
        }
        
        // Query by userId/borrowerId if available
        if (userId) {
          try {
            const byUserIdQuery = query(
              collection(db, 'borrowed_supplies'),
              where('borrowerId', '==', userId)
            );
            const byUserIdSnapshot = await getDocs(byUserIdQuery);
            byUserIdSnapshot.docs.forEach(doc => {
              if (!borrowedItemsToDelete.find(item => item.id === doc.id)) {
                borrowedItemsToDelete.push(doc);
              }
            });
          } catch (err) {
            console.log('No items found by borrowerId:', err.message);
          }
          
          try {
            const byUserIdQuery2 = query(
              collection(db, 'borrowed_supplies'),
              where('userId', '==', userId)
            );
            const byUserIdSnapshot2 = await getDocs(byUserIdQuery2);
            byUserIdSnapshot2.docs.forEach(doc => {
              if (!borrowedItemsToDelete.find(item => item.id === doc.id)) {
                borrowedItemsToDelete.push(doc);
              }
            });
          } catch (err) {
            console.log('No items found by userId:', err.message);
          }
        }
        
        console.log(`📦 Found ${borrowedItemsToDelete.length} borrowed items to delete`);
        
        // Delete each borrowed item and restore inventory
        for (const borrowedDoc of borrowedItemsToDelete) {
          const borrowedData = borrowedDoc.data();
          
          // Restore inventory if item was borrowed or pending
          if ((borrowedData.status === 'borrowed' || borrowedData.status === 'pending') && borrowedData.supplyId) {
            try {
              const supplyDoc = await getDoc(doc(db, 'supplies', borrowedData.supplyId));
              if (supplyDoc.exists()) {
                const currentStock = supplyDoc.data().availableQuantity || 0;
                const quantity = borrowedData.quantity || 1;
                const newAvailable = currentStock + quantity;
                
                await updateDoc(doc(db, 'supplies', borrowedData.supplyId), {
                  availableQuantity: newAvailable,
                  status: 'available',
                  updatedAt: serverTimestamp()
                });
                
                console.log(`✅ Restored ${quantity} units of ${borrowedData.supplyName} to inventory (new total: ${newAvailable})`);
              }
            } catch (err) {
              console.error('Error restoring inventory for item:', borrowedData.supplyName, err);
            }
          }
          
          // Delete the borrowed item
          await deleteDoc(doc(db, 'borrowed_supplies', borrowedDoc.id));
          console.log(`🗑️ Deleted borrowed item: ${borrowedData.supplyName}`);
        }
        
        // Finally, delete the service request
        await deleteDoc(doc(db, 'service_requests', id));
        console.log('✅ Service request deleted successfully');
        
        // Refresh data
        setServiceRequests(serviceRequests.filter(r => r.id !== id));
        fetchBorrowedItems();
        
        alert(`✅ Service request and ${borrowedItemsToDelete.length} associated borrowed item(s) have been deleted. Inventory restored.`);
      } catch (error) {
        console.error('Error deleting service request:', error);
        alert('Failed to delete service request: ' + error.message);
      }
    }
  };

  const handleResolve = (report) => {
    setSelectedReport(report);
    // Load existing notes based on status
    const existingNotes = report.solutionDescription || report.actionNotes || report.resolutionFeedback || '';
    setResolutionFeedback(existingNotes);
    setShowResolveModal(true);
  };

  const handleViewDetails = (report) => {
    console.log('Report details:', report);
    console.log('Image URL:', report.imageUrl);
    console.log('Media URLs:', report.mediaUrls);
    console.log('Media URL:', report.mediaUrl);
    setSelectedReport(report);
    setShowDetailsModal(true);
  };

  const handleViewRequest = (req) => {
    setSelectedRequest(req);
    setShowRequestModal(true);
  };

  const openAction = (req, type) => {
    setSelectedRequest(req);
    setActionType(type);
    setAdminNotes('');
    setShowActionModal(true);
    setShowRequestModal(false);
  };

  const openReportAction = (report, type) => {
    setSelectedReport(report);
    setReportActionType(type);
    setResolutionFeedback('');
    setShowReportActionModal(true);
    setShowDetailsModal(false);
  };

  const openBorrowAction = (item, actionType = 'complete') => {
    setSelectedBorrowedItem(item);
    setBorrowActionType(actionType); // 'approve' or 'complete'
    setBorrowAdminNotes('');
    setShowBorrowActionModal(true);
  };

  const handleSubmitResolution = async () => {
    if (!resolutionFeedback.trim()) {
      alert('Please provide resolution feedback');
      return;
    }
    setResolving(true);
    try {
      // Refresh auth token
      const currentUser = auth.currentUser;
      if (currentUser) await currentUser.getIdToken(true);
      
      await updateDoc(doc(db, 'reports', selectedReport.id), {
        status: 'resolved',
        solutionDescription: resolutionFeedback,  // Mobile app field
        resolutionFeedback,  // Backward compatibility
        resolvedAt: serverTimestamp(),
        resolvedBy: 'Admin'
      });
      setReports(reports.map(r => r.id === selectedReport.id ? { 
        ...r, 
        status: 'resolved', 
        resolutionFeedback,
        solutionDescription: resolutionFeedback  // Mobile app field
      } : r));
      setShowResolveModal(false);
      setResolutionFeedback('');
      setSelectedReport(null);
    } catch (error) {
      console.error('Error resolving report:', error);
      alert('Failed to update report. Please try again.');
    } finally {
      setResolving(false);
    }
  };

  const handleSubmitAction = async () => {
    if (!selectedRequest) return;
    const newStatus = actionType === 'approve' ? 'in-progress' : actionType === 'complete' ? 'completed' : 'rejected';
    try {
      // Refresh auth token
      const currentUser = auth.currentUser;
      if (currentUser) await currentUser.getIdToken(true);
      
      // Build update data with correct field names for mobile app
      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: 'Admin'
      };
      
      // Add correct fields based on status for mobile app
      if (newStatus === 'in-progress') {
        updateData.actionNotes = adminNotes || '';
        updateData.actionedAt = serverTimestamp();
      } else if (newStatus === 'completed') {
        updateData.solutionDescription = adminNotes || '';
        updateData.completedAt = serverTimestamp();
      } else if (newStatus === 'rejected') {
        updateData.rejectionReason = adminNotes || '';
        updateData.rejectedAt = serverTimestamp();
      }
      
      // Keep old field for backward compatibility
      updateData.adminNotes = adminNotes || '';
      
      // Update service request status
      await updateDoc(doc(db, 'service_requests', selectedRequest.id), updateData);
      
      // If marking as completed, automatically return all borrowed supplies
      if (actionType === 'complete') {
        console.log('📦 Auto-returning borrowed supplies for completed service request:', selectedRequest.id);
        
        try {
          // Find all borrowed items for this service request
          const borrowedQuery = query(
            collection(db, 'borrowed_supplies'),
            where('serviceRequestId', '==', selectedRequest.id)
          );
          const borrowedSnapshot = await getDocs(borrowedQuery);
          
          let returnedCount = 0;
          let restoredCount = 0;
          
          // Process each borrowed item
          for (const borrowedDoc of borrowedSnapshot.docs) {
            const borrowedData = borrowedDoc.data();
            
            // Only process if not already returned
            if (borrowedData.status !== 'returned') {
              // Mark as returned
              await updateDoc(doc(db, 'borrowed_supplies', borrowedDoc.id), {
                status: 'returned',
                returnedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                updatedBy: 'Admin (Auto-returned)',
                autoReturned: true // Flag to indicate automatic return
              });
              
              returnedCount++;
              
              // Return items to inventory
              if (borrowedData.supplyId) {
                try {
                  const supplyDoc = await getDoc(doc(db, 'supplies', borrowedData.supplyId));
                  if (supplyDoc.exists()) {
                    const currentAvailable = supplyDoc.data().availableQuantity || 0;
                    const newAvailable = currentAvailable + (borrowedData.quantity || 1);
                    
                    await updateDoc(doc(db, 'supplies', borrowedData.supplyId), {
                      availableQuantity: newAvailable,
                      status: 'available',
                      updatedAt: serverTimestamp()
                    });
                    
                    restoredCount++;
                    console.log(`✅ Restored ${borrowedData.quantity} units of ${borrowedData.supplyName} to inventory`);
                  }
                } catch (err) {
                  console.error('Error restoring inventory:', err);
                }
              }
            }
          }
          
          if (returnedCount > 0) {
            console.log(`✅ Auto-returned ${returnedCount} borrowed item(s) and restored ${restoredCount} to inventory`);
          }
          
          // Refresh borrowed items list
          fetchBorrowedItems();
        } catch (err) {
          console.error('Error auto-returning borrowed supplies:', err);
          // Don't fail the whole operation if this fails
        }
      }
      
      setServiceRequests(prev => prev.map(r => r.id === selectedRequest.id ? { 
        ...r, 
        status: newStatus, 
        adminNotes,
        actionNotes: newStatus === 'in-progress' ? adminNotes : r.actionNotes,
        solutionDescription: newStatus === 'completed' ? adminNotes : r.solutionDescription,
        rejectionReason: newStatus === 'rejected' ? adminNotes : r.rejectionReason
      } : r));
      setShowActionModal(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error updating service request:', error);
      alert('Failed to update. Please try again.');
    }
  };

  const handleSubmitReportAction = async () => {
    if (!selectedReport) return;
    const newStatus = reportActionType === 'action' ? 'in-progress' : reportActionType === 'complete' ? 'resolved' : 'rejected';
    try {
      // Refresh auth token
      const currentUser = auth.currentUser;
      if (currentUser) await currentUser.getIdToken(true);
      
      // Build update data with correct field names for mobile app
      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: 'Admin'
      };
      
      // Add correct fields based on status for mobile app
      if (newStatus === 'in-progress') {
        updateData.actionNotes = resolutionFeedback || '';
        updateData.actionedAt = serverTimestamp();
      } else if (newStatus === 'resolved') {
        updateData.solutionDescription = resolutionFeedback || '';
        updateData.resolvedAt = serverTimestamp();
      } else if (newStatus === 'rejected') {
        updateData.rejectionReason = resolutionFeedback || '';
        updateData.rejectedAt = serverTimestamp();
      }
      
      // Keep old field for backward compatibility
      updateData.resolutionFeedback = resolutionFeedback || '';
      
      await updateDoc(doc(db, 'reports', selectedReport.id), updateData);
      setReports(prev => prev.map(r => r.id === selectedReport.id ? { 
        ...r, 
        status: newStatus, 
        resolutionFeedback,
        actionNotes: newStatus === 'in-progress' ? resolutionFeedback : r.actionNotes,
        solutionDescription: newStatus === 'resolved' ? resolutionFeedback : r.solutionDescription
      } : r));
      setShowReportActionModal(false);
      setSelectedReport(null);
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Failed to update. Please try again.');
    }
  };

  const handleMarkAsReturned = async (item) => {
    if (!window.confirm('Mark this item as returned?')) return;
    
    try {
      const borrowedRef = doc(db, 'borrowed_supplies', item.id);
      
      // Update borrowed item status to returned
      await updateDoc(borrowedRef, {
        status: 'returned',
        returnedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: 'Admin'
      });
      
      // Return items to inventory (works for both 'borrowed' and 'pending' status)
      if (item.supplyId) {
        const supplyDoc = await getDoc(doc(db, 'supplies', item.supplyId));
        if (supplyDoc.exists()) {
          const currentAvailable = supplyDoc.data().availableQuantity || 0;
          const newAvailable = currentAvailable + (item.quantity || 1);
          
          await updateDoc(doc(db, 'supplies', item.supplyId), {
            availableQuantity: newAvailable,
            status: 'available',
            updatedAt: serverTimestamp()
          });
        }
      }
      
      alert('✅ Item marked as returned successfully! Inventory has been updated.');
      fetchBorrowedItems();
      setSelectedBorrowedItem(null);
      setShowBorrowedDetailsModal(false);
    } catch (error) {
      console.error('Error marking as returned:', error);
      alert('Failed to mark item as returned');
    }
  };

  const handleDeleteBorrowedItem = async (item) => {
    const confirmMessage = (item.status === 'borrowed' || item.status === 'pending')
      ? `Are you sure you want to delete this borrowed item from ${item.borrowerName}? The item will be returned to inventory.`
      : `Are you sure you want to delete this borrow request from ${item.borrowerName}?`;
      
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      // If item is currently borrowed/pending, restore inventory
      if ((item.status === 'borrowed' || item.status === 'pending') && item.supplyId) {
        const supplyDoc = await getDoc(doc(db, 'supplies', item.supplyId));
        if (supplyDoc.exists()) {
          const currentStock = supplyDoc.data().availableQuantity || 0;
          const newAvailable = currentStock + (item.quantity || 1);
          
          await updateDoc(doc(db, 'supplies', item.supplyId), {
            availableQuantity: newAvailable,
            status: 'available',
            updatedAt: serverTimestamp()
          });
        }
      }
      
      // Delete the borrow record
      await deleteDoc(doc(db, 'borrowed_supplies', item.id));
      
      const successMessage = (item.status === 'borrowed' || item.status === 'pending')
        ? '✅ Borrow request deleted successfully! Inventory has been updated.'
        : '✅ Borrow request deleted successfully!';
      alert(successMessage);
      
      fetchBorrowedItems();
      setShowBorrowedDetailsModal(false);
      setSelectedBorrowedItem(null);
    } catch (error) {
      console.error('Error deleting borrowed item:', error);
      alert('Failed to delete borrow request. Please try again.');
    }
  };

  const handleDeleteAllBorrowerItems = async (borrower) => {
    const confirmMessage = `Are you sure you want to delete all ${borrower.totalItems} borrow record(s) from ${borrower.borrowerName}? Items will be returned to inventory.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      let restoredCount = 0;
      let deletedCount = 0;
      
      // Delete all items for this borrower
      for (const item of borrower.items) {
        // Restore inventory if item was borrowed or pending
        if ((item.status === 'borrowed' || item.status === 'pending') && item.supplyId) {
          try {
            const supplyDoc = await getDoc(doc(db, 'supplies', item.supplyId));
            if (supplyDoc.exists()) {
              const currentStock = supplyDoc.data().availableQuantity || 0;
              const newAvailable = currentStock + (item.quantity || 1);
              
              await updateDoc(doc(db, 'supplies', item.supplyId), {
                availableQuantity: newAvailable,
                status: 'available',
                updatedAt: serverTimestamp()
              });
              
              restoredCount++;
              console.log(`✅ Restored ${item.quantity} units of ${item.supplyName}`);
            }
          } catch (err) {
            console.error('Error restoring inventory for item:', item.supplyName, err);
          }
        }
        
        // Delete the borrowed item
        await deleteDoc(doc(db, 'borrowed_supplies', item.id));
        deletedCount++;
        console.log(`🗑️ Deleted borrowed item: ${item.supplyName}`);
      }
      
      alert(`✅ Successfully deleted ${deletedCount} borrow record(s) and restored ${restoredCount} item(s) to inventory.`);
      
      fetchBorrowedItems();
      setShowBorrowedDetailsModal(false);
      setSelectedBorrowedItem(null);
    } catch (error) {
      console.error('Error deleting borrower items:', error);
      alert('Failed to delete borrow records. Please try again.');
    }
  };

  const handleSubmitBorrowAction = async () => {
    if (!selectedBorrowedItem) return;
    
    try {
      const borrowedRef = doc(db, 'borrowed_supplies', selectedBorrowedItem.id);
      
      if (borrowActionType === 'approve') {
        // Approve pending request - deduct from inventory
        
        // First, check if there's enough stock
        if (selectedBorrowedItem.supplyId) {
          const supplyDoc = await getDoc(doc(db, 'supplies', selectedBorrowedItem.supplyId));
          if (supplyDoc.exists()) {
            const supplyData = supplyDoc.data();
            const currentAvailable = supplyData.availableQuantity || 0;
            const requestedQty = selectedBorrowedItem.quantity || 1;
            
            if (currentAvailable < requestedQty) {
              alert(`⚠️ Not enough stock! Available: ${currentAvailable}, Requested: ${requestedQty}`);
              return;
            }
            
            // Deduct from inventory
            const newAvailable = currentAvailable - requestedQty;
            await updateDoc(doc(db, 'supplies', selectedBorrowedItem.supplyId), {
              availableQuantity: newAvailable,
              status: newAvailable > 0 ? 'available' : 'unavailable',
              updatedAt: serverTimestamp()
            });
          }
        }
        
        // Update borrowed item status to borrowed
        await updateDoc(borrowedRef, {
          status: 'borrowed',
          adminNotes: borrowAdminNotes || '',
          updatedAt: serverTimestamp(),
          updatedBy: 'Admin'
        });
        
        alert('✅ Request approved! Inventory has been updated.');
        
      } else {
        // Mark as returned - return to inventory
        const newStatus = 'returned';
        
        // Prepare update data
        const updateData = {
          status: newStatus,
          adminNotes: borrowAdminNotes || '',
          returnedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          updatedBy: 'Admin'
        };
        
        // Update borrowed item
        await updateDoc(borrowedRef, updateData);
        
        // Return items to inventory
        if (selectedBorrowedItem.supplyId) {
          const supplyDoc = await getDoc(doc(db, 'supplies', selectedBorrowedItem.supplyId));
          if (supplyDoc.exists()) {
            const supplyData = supplyDoc.data();
            const newAvailable = (supplyData.availableQuantity || 0) + (selectedBorrowedItem.quantity || 1);
            await updateDoc(doc(db, 'supplies', selectedBorrowedItem.supplyId), {
              availableQuantity: newAvailable,
              status: 'available',
              updatedAt: serverTimestamp()
            });
          }
        }
        
        alert('✅ Item marked as returned! Inventory has been updated.');
      }
      
      fetchBorrowedItems();
      setShowBorrowActionModal(false);
      setSelectedBorrowedItem(null);
      setBorrowAdminNotes('');
    } catch (error) {
      console.error('Error processing borrow action:', error);
      alert('Failed to process action. Please try again.');
    }
  };

  const isOverdue = (item) => {
    if (item.status === 'returned') return false;
    return new Date() > item.returnBy;
  };

  const statusColor = (status) => {
    if (status === 'completed' || status === 'resolved') return 'bg-green-100 text-green-700';
    if (status === 'in-progress') return 'bg-blue-100 text-blue-700';
    if (status === 'rejected') return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  // Sort helper to ensure newest items appear first (even after filtering)
  const sortByNewest = (items) => {
    return [...items].sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
      const dateB = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
      return dateB - dateA; // Descending order (newest first)
    });
  };

  const filteredReports = sortByNewest(
    filter === 'all' ? reports : 
    filter.startsWith('status:') ? reports.filter(r => {
      const status = filter.replace('status:', '');
      return status === 'all' ? true : (r.status || 'pending') === status;
    }) : reports.filter(r => r.category?.toLowerCase() === filter.toLowerCase())
  );
  const filteredRequests = sortByNewest(
    serviceFilter === 'all' ? serviceRequests : serviceRequests.filter(r => (r.status || 'pending') === serviceFilter)
  );
  const filteredBorrowedItems = suppliesFilter === 'all' ? borrowedItems : 
    borrowedItems.filter(item => item.status === suppliesFilter);

  // Group borrowed items by borrower
  const groupedBorrowers = filteredBorrowedItems.reduce((acc, item) => {
    // Try to get a consistent ID - prefer email for grouping as it's more reliable
    const borrowerId = item.borrowerId || item.userId || item.borrower || 'unknown';
    const borrowerEmail = item.borrowerEmail?.toLowerCase();
    
    // Create a unique key - use email if available, otherwise use ID
    const groupKey = borrowerEmail && borrowerEmail !== '' ? borrowerEmail : borrowerId;
    
    if (!acc[groupKey]) {
      acc[groupKey] = {
        borrowerId,
        borrowerName: item.borrowerName,
        borrowerEmail: item.borrowerEmail,
        items: [],
        totalItems: 0,
        statuses: { pending: 0, borrowed: 0, returned: 0 }
      };
    }
    acc[groupKey].items.push(item);
    acc[groupKey].totalItems++;
    acc[groupKey].statuses[item.status] = (acc[groupKey].statuses[item.status] || 0) + 1;
    
    // Set the earliest borrowed date and latest return date
    if (!acc[groupKey].borrowedAt || item.borrowedAt < acc[groupKey].borrowedAt) {
      acc[groupKey].borrowedAt = item.borrowedAt;
    }
    if (!acc[groupKey].returnBy || item.returnBy > acc[groupKey].returnBy) {
      acc[groupKey].returnBy = item.returnBy;
    }
    
    return acc;
  }, {});

  const borrowersList = Object.values(groupedBorrowers);

  const pendingRequestsCount = serviceRequests.filter(r => !r.status || r.status === 'pending').length;
  const pendingReportsCount = reports.filter(r => !r.status || r.status === 'pending').length;
  const pendingBorrowCount = borrowedItems.filter(i => i.status === 'pending').length;
  const borrowedCount = borrowedItems.filter(i => i.status === 'borrowed').length;
  const totalServiceCount = pendingRequestsCount + pendingBorrowCount;

  console.log('📊 ViewReports Stats:', { 
    loading, 
    reportsCount: reports.length, 
    serviceRequestsCount: serviceRequests.length,
    borrowedItemsCount: borrowedItems.length,
    activeTab,
    serviceSubTab
  });

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-xl font-semibold text-gray-600">Loading reports and services...</div>
    </div>
  );

  return (
    <div>
      {/* Header with Tabs */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">View Reports</h1>
        <button
          onClick={async () => { 
            setLoading(true);
            await Promise.all([
              fetchReports(), 
              fetchServiceRequests(), 
              fetchBorrowedItems()
            ]);
            setLoading(false);
          }}
          className="bg-[#4A90E2] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#3d7bc7]"
        >
          <RefreshCw size={20} /> Refresh
        </button>
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-5 py-3 font-medium flex items-center gap-2 transition-colors ${activeTab === 'reports' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
        >
          <FileText size={18} />
          Reports
          {pendingReportsCount > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingReportsCount}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('service_requests')}
          className={`px-5 py-3 font-medium flex items-center gap-2 transition-colors ${activeTab === 'service_requests' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
        >
          <ClipboardList size={18} />
          Service Requests
          {totalServiceCount > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{totalServiceCount}</span>
          )}
        </button>
        <div className="flex-1"></div>
        <button
          onClick={() => navigate('/supplies')}
          className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 my-2"
        >
          <Package size={18} /> Barangay Supplies
        </button>
      </div>

      {/* ===================== REPORTS TAB ===================== */}
      {activeTab === 'reports' && (
        <>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Filter size={20} />
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-4 py-2 border rounded-lg">
                <option value="all">All Categories</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Peace And Order">Peace And Order</option>
                <option value="Animal-Related Complaints">Animal-Related Complaints</option>
                <option value="Sanitation">Sanitation</option>
                <option value="Health">Health</option>
                <option value="Environment">Environment</option>
                <option value="Safety">Safety</option>
                <option value="Utilities">Utilities</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <select 
              value={filter.startsWith('status:') ? filter : 'status:all'} 
              onChange={(e) => setFilter(e.target.value)} 
              className="px-4 py-2 border rounded-lg"
            >
              <option value="status:all">All Status</option>
              <option value="status:pending">Pending</option>
              <option value="status:in-progress">In Progress</option>
              <option value="status:resolved">Resolved</option>
              <option value="status:rejected">Rejected</option>
            </select>
          </div>

          <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
            <table className="w-full min-w-max">
              <thead className="bg-[#4A90E2] text-white">
                <tr>
                  <th className="px-6 py-3 text-left">#</th>
                  <th className="px-6 py-3 text-left">Reported By</th>
                  <th className="px-6 py-3 text-left">Category</th>
                  <th className="px-6 py-3 text-left">Description</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.length === 0 ? (
                  <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">No reports found</td></tr>
                ) : (
                  filteredReports.map((report, index) => (
                    <tr key={report.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                            <span className="text-blue-700 font-semibold text-xs">
                              {(report.reporterName || report.userName || 'A').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium">{report.reporterName || report.userName || 'Anonymous'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">{report.category || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate">{report.description || 'No description'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap flex items-center gap-1 w-fit ${statusColor(report.status || 'pending')}`}>
                          {(report.status || 'pending') === 'pending' && <Clock size={12} />}
                          {(report.status || 'pending') === 'in-progress' && <AlertCircle size={12} />}
                          {(report.status || 'pending') === 'resolved' && <CheckCircle size={12} />}
                          {(report.status || 'pending') === 'rejected' && <XCircle size={12} />}
                          {(report.status || 'Pending').charAt(0).toUpperCase() + (report.status || 'pending').slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {report.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => handleViewDetails(report)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="View Details">
                            <Eye size={18} />
                          </button>
                          {(!report.status || report.status === 'pending') && (
                            <>
                              <button onClick={() => openReportAction(report, 'action')} className="p-2 text-green-600 hover:bg-green-50 rounded" title="Take Action">
                                <CheckCircle size={18} />
                              </button>
                              <button onClick={() => openReportAction(report, 'reject')} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Reject">
                                <XCircle size={18} />
                              </button>
                            </>
                          )}
                          {report.status === 'in-progress' && (
                            <button onClick={() => openReportAction(report, 'complete')} className="p-2 text-green-600 hover:bg-green-50 rounded" title="Mark as Resolved">
                              <CheckCircle size={18} />
                            </button>
                          )}
                          <button onClick={() => handleDelete(report.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete">
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
        </>
      )}

      {/* ===================== SERVICE REQUESTS TAB ===================== */}
      {activeTab === 'service_requests' && (
        <>
          {/* Sub-tabs for Service Requests with Back Button */}
          <div className="flex gap-2 mb-4 border-b items-center">
            <button
              onClick={() => setServiceSubTab('requests')}
              className={`px-4 py-2 font-medium flex items-center gap-2 transition-colors ${serviceSubTab === 'requests' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
            >
              <ClipboardList size={18} />
              Service Requests
              {pendingRequestsCount > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingRequestsCount}</span>
              )}
            </button>
            <button
              onClick={() => setServiceSubTab('borrowed')}
              className={`px-4 py-2 font-medium flex items-center gap-2 transition-colors ${serviceSubTab === 'borrowed' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
            >
              <Package size={18} />
              Borrowed Items
              {pendingBorrowCount > 0 && (
                <span className="ml-1 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingBorrowCount}</span>
              )}
            </button>
            <div className="flex-1"></div>
            <button
              onClick={() => setActiveTab('reports')}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2"
            >
              ← Back to Reports
            </button>
          </div>

          {serviceSubTab === 'requests' && (
          <>
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} />
            <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="px-4 py-2 border rounded-lg">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
            <table className="w-full min-w-max">
              <thead className="bg-[#4A90E2] text-white">
                <tr>
                  <th className="px-6 py-3 text-left">#</th>
                  <th className="px-6 py-3 text-left">Requested By</th>
                  <th className="px-6 py-3 text-left">Service Type</th>
                  <th className="px-6 py-3 text-left">Description</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-left sticky right-0 bg-[#4A90E2]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">No service requests found</td></tr>
                ) : (
                  filteredRequests.map((req, index) => (
                    <tr key={req.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-green-700 font-semibold text-xs">
                              {(req.resolvedName || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 whitespace-nowrap">{req.resolvedName || 'Unknown User'}</p>
                            {req.resolvedEmail && <p className="text-xs text-gray-500 whitespace-nowrap">{req.resolvedEmail}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs whitespace-nowrap">{req.serviceType || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate">{req.description || 'No description'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap flex items-center gap-1 w-fit ${statusColor(req.status || 'pending')}`}>
                          {(req.status || 'pending') === 'pending' && <Clock size={12} />}
                          {(req.status || 'pending') === 'in-progress' && <AlertCircle size={12} />}
                          {(req.status || 'pending') === 'completed' && <CheckCircle size={12} />}
                          {(req.status || 'pending') === 'rejected' && <XCircle size={12} />}
                          {(req.status || 'Pending').charAt(0).toUpperCase() + (req.status || 'pending').slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {req.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}
                      </td>
                      <td className="px-6 py-4 sticky right-0 bg-white border-l shadow-sm">
                        <div className="flex gap-1">
                          <button onClick={() => handleViewRequest(req)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="View">
                            <Eye size={18} />
                          </button>
                          {(!req.status || req.status === 'pending') && (
                            <>
                              <button onClick={() => openAction(req, 'approve')} className="p-2 text-green-600 hover:bg-green-50 rounded" title="Approve / Process">
                                <CheckCircle size={18} />
                              </button>
                              <button onClick={() => openAction(req, 'reject')} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Reject">
                                <XCircle size={18} />
                              </button>
                            </>
                          )}
                          {req.status === 'in-progress' && (
                            <button onClick={() => openAction(req, 'complete')} className="p-2 text-green-600 hover:bg-green-50 rounded" title="Mark Complete">
                              <CheckCircle size={18} />
                            </button>
                          )}
                          <button onClick={() => handleDeleteRequest(req.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete">
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
          </>
          )}

          {serviceSubTab === 'borrowed' && (
          <>
          <div className="flex items-center mb-4">
            <div className="flex items-center gap-2">
              <Filter size={20} />
              <select value={suppliesFilter} onChange={(e) => setSuppliesFilter(e.target.value)} className="px-4 py-2 border rounded-lg">
                <option value="all">All Status ({borrowedItems.length})</option>
                <option value="pending">Pending Approval ({borrowedItems.filter(i => i.status === 'pending').length})</option>
                <option value="borrowed">Currently Borrowed ({borrowedItems.filter(i => i.status === 'borrowed').length})</option>
                <option value="returned">Returned ({borrowedItems.filter(i => i.status === 'returned').length})</option>
              </select>
            </div>
          </div>

          {borrowersList.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">No borrowed supplies found</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
              <table className="w-full min-w-max">
                <thead className="bg-[#4A90E2] text-white">
                  <tr>
                    <th className="px-6 py-3 text-left">#</th>
                    <th className="px-6 py-3 text-left">Borrower</th>
                    <th className="px-6 py-3 text-left">Items Borrowed</th>
                    <th className="px-6 py-3 text-left">Status Summary</th>
                    <th className="px-6 py-3 text-left">Borrowed Date</th>
                    <th className="px-6 py-3 text-left">Return By</th>
                    <th className="px-6 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {borrowersList.map((borrower, index) => {
                    const hasOverdue = borrower.items.some(item => isOverdue(item));
                    const primaryStatus = borrower.statuses.pending > 0 ? 'pending' 
                      : borrower.statuses.borrowed > 0 ? 'borrowed' 
                      : 'returned';
                    
                    return (
                      <tr key={borrower.borrowerId} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4">{index + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-700 font-bold text-lg">
                                {(borrower.borrowerName || 'U').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{borrower.borrowerName}</p>
                              {borrower.borrowerEmail && (
                                <p className="text-xs text-gray-500">{borrower.borrowerEmail}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-gray-900">{borrower.totalItems} item{borrower.totalItems !== 1 ? 's' : ''}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {borrower.statuses.pending > 0 && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 flex items-center gap-1 w-fit">
                                <Clock size={12} />
                                {borrower.statuses.pending} Pending
                              </span>
                            )}
                            {borrower.statuses.borrowed > 0 && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 flex items-center gap-1 w-fit">
                                <Package size={12} />
                                {borrower.statuses.borrowed} Borrowed
                              </span>
                            )}
                            {borrower.statuses.returned > 0 && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1 w-fit">
                                <CheckCircle size={12} />
                                {borrower.statuses.returned} Returned
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                          {borrower.borrowedAt && borrower.borrowedAt.toLocaleDateString ? borrower.borrowedAt.toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={hasOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}>
                            {borrower.returnBy && borrower.returnBy.toLocaleDateString ? borrower.returnBy.toLocaleDateString() : 'N/A'}
                            {hasOverdue && ' (Overdue)'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => { 
                                setSelectedBorrowedItem(borrower); 
                                setShowBorrowedDetailsModal(true); 
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              title="View All Items"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteAllBorrowerItems(borrower)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                              title="Delete All Records"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          </>
          )}
        </>
      )}

      {/* ========== REPORT RESOLVE MODAL ========== */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Resolve Report</h2>
              <button onClick={() => setShowResolveModal(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2"><strong>Category:</strong> {selectedReport?.category}</p>
              <p className="text-sm text-gray-600 mb-4"><strong>Description:</strong> {selectedReport?.description}</p>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">How did the barangay resolve this problem?</label>
              <textarea value={resolutionFeedback} onChange={(e) => setResolutionFeedback(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[120px]" placeholder="Describe the resolution steps taken..." />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowResolveModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">Cancel</button>
              <button onClick={handleSubmitResolution} disabled={resolving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {resolving ? 'Saving...' : 'Mark as Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== REPORT DETAILS MODAL ========== */}
      {showDetailsModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-3 border-b z-10">
              <h2 className="text-xl font-bold text-gray-800">Report Details</h2>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-500 hover:text-gray-700 p-2 rounded-full"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-bold text-gray-700">Category</label><p className="mt-1 px-3 py-2 bg-blue-50 rounded">{selectedReport.category || 'N/A'}</p></div>
                <div><label className="text-sm font-bold text-gray-700">Status</label>
                  <p className="mt-1"><span className={`px-3 py-2 rounded inline-block ${statusColor(selectedReport.status)}`}>{selectedReport.status || 'Pending'}</span></p>
                </div>
              </div>
              <div><label className="text-sm font-bold text-gray-700">Description</label><p className="mt-1 px-3 py-2 bg-gray-50 rounded">{selectedReport.description || 'No description'}</p></div>
              <div><label className="text-sm font-bold text-gray-700">Location</label><p className="mt-1 px-3 py-2 bg-gray-50 rounded">{selectedReport.location || 'Not specified'}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-bold text-gray-700">Reporter</label><p className="mt-1 px-3 py-2 bg-gray-50 rounded">{selectedReport.reporterName || 'Anonymous'}</p></div>
                <div><label className="text-sm font-bold text-gray-700">Date Reported</label><p className="mt-1 px-3 py-2 bg-gray-50 rounded">{selectedReport.createdAt?.toDate?.().toLocaleString() || 'N/A'}</p></div>
              </div>
              {/* Show all attached images */}
              {(selectedReport.imageUrl || selectedReport.mediaUrls?.length > 0 || selectedReport.mediaUrl) && (
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block">
                    {selectedReport.mediaUrls?.length > 1 ? 'Attached Images' : 'Attached Image'}
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {/* Show all images from mediaUrls array */}
                    {selectedReport.mediaUrls && selectedReport.mediaUrls.length > 0 ? (
                      selectedReport.mediaUrls.map((url, idx) => {
                        // Only render valid URLs
                        if (!url || typeof url !== 'string' || url.trim() === '') return null;
                        return (
                          <div key={idx} className="relative">
                            <img 
                              src={url} 
                              alt={`Report attachment ${idx + 1}`} 
                              className="w-full max-h-96 object-contain rounded-lg bg-gray-50 p-2 border" 
                              loading="lazy"
                              onError={(e) => {
                                e.target.onerror = null; // Prevent infinite loop
                                e.target.style.display = 'none';
                                if (!e.target.nextElementSibling?.classList.contains('image-error-fallback')) {
                                  const errorDiv = document.createElement('div');
                                  errorDiv.className = 'p-8 bg-gray-100 rounded-lg text-gray-500 text-center border image-error-fallback';
                                  errorDiv.textContent = `Image ${idx + 1} not available`;
                                  e.target.parentElement.appendChild(errorDiv);
                                }
                              }}
                            />
                          </div>
                        );
                      })
                    ) : selectedReport.imageUrl || selectedReport.mediaUrl ? (
                      /* Fallback to single imageUrl or mediaUrl */
                      <img 
                        src={selectedReport.imageUrl || selectedReport.mediaUrl} 
                        alt="Report attachment" 
                        className="w-full max-h-96 object-contain rounded-lg bg-gray-50 p-2 border" 
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null; // Prevent infinite loop
                          e.target.style.display = 'none';
                          if (!e.target.nextElementSibling?.classList.contains('image-error-fallback')) {
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'p-8 bg-gray-100 rounded-lg text-gray-500 text-center border image-error-fallback';
                            errorDiv.textContent = 'Image not available';
                            e.target.parentElement.appendChild(errorDiv);
                          }
                        }}
                      />
                    ) : (
                      <div className="p-8 bg-gray-100 rounded-lg text-gray-500 text-center border">
                        No image attached
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Debug info - show if no images found but other fields exist */}
              {!(selectedReport.imageUrl || selectedReport.mediaUrls?.length > 0 || selectedReport.mediaUrl) && 
               (selectedReport.image || selectedReport.photoURL || selectedReport.attachments) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <label className="text-sm font-bold text-yellow-800">Image Data Available (Different Format)</label>
                  <p className="text-xs text-yellow-700 mt-1">
                    Check console for details. Image field names: 
                    {selectedReport.image && ' image'}
                    {selectedReport.photoURL && ' photoURL'}
                    {selectedReport.attachments && ' attachments'}
                  </p>
                </div>
              )}
              {/* Show notes based on status - check correct field names for mobile app */}
              {(() => {
                const notesText = selectedReport.solutionDescription || selectedReport.actionNotes || selectedReport.resolutionFeedback || selectedReport.rejectionReason;
                if (!notesText) return null;
                
                return (
                  <div className={`rounded-lg p-4 ${
                    selectedReport.status === 'resolved' 
                      ? 'bg-green-50 border border-green-200' 
                      : selectedReport.status === 'rejected'
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-blue-50 border border-blue-200'
                  }`}>
                    <label className={`text-sm font-bold ${
                      selectedReport.status === 'resolved' 
                        ? 'text-green-800' 
                        : selectedReport.status === 'rejected'
                        ? 'text-red-800'
                        : 'text-blue-800'
                    }`}>
                      {selectedReport.status === 'resolved' 
                        ? '✅ Resolution' 
                        : selectedReport.status === 'rejected'
                        ? '❌ Rejection Reason'
                        : '🔄 Action Notes'}
                    </label>
                    <p className={`mt-1 ${
                      selectedReport.status === 'resolved' 
                        ? 'text-green-700' 
                        : selectedReport.status === 'rejected'
                        ? 'text-red-700'
                        : 'text-blue-700'
                    }`}>{notesText}</p>
                    {selectedReport.resolvedAt && <p className="mt-2 text-xs text-green-600">Resolved on: {selectedReport.resolvedAt?.toDate?.().toLocaleString() || 'N/A'}</p>}
                  </div>
                );
              })()}
              <div className="flex gap-2 pt-2">
                {(!selectedReport.status || selectedReport.status === 'pending') && (
                  <>
                    <button onClick={() => openReportAction(selectedReport, 'action')} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
                      <CheckCircle size={16} /> Take Action
                    </button>
                    <button onClick={() => openReportAction(selectedReport, 'reject')} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2">
                      <XCircle size={16} /> Reject
                    </button>
                  </>
                )}
                {selectedReport.status === 'in-progress' && (
                  <button onClick={() => openReportAction(selectedReport, 'complete')} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
                    <CheckCircle size={16} /> Mark as Resolved
                  </button>
                )}
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="w-full bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"><X size={20} />Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== SERVICE REQUEST DETAILS MODAL ========== */}
      {showRequestModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-3 border-b">
              <h2 className="text-xl font-bold text-gray-800">Service Request Details</h2>
              <button onClick={() => setShowRequestModal(false)} className="text-gray-500 hover:text-gray-700 p-2 rounded-full"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center">
                  <span className="text-green-700 font-bold text-xl">{(selectedRequest.resolvedName || selectedRequest.requestedBy || 'U').charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-bold text-gray-800">{selectedRequest.resolvedName || selectedRequest.requestedBy || 'Unknown User'}</p>
                  <p className="text-sm text-gray-500">{selectedRequest.resolvedEmail || selectedRequest.userEmail || ''}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-gray-700">Service Type</label>
                  <p className="mt-1 px-3 py-2 bg-blue-50 rounded text-sm">{selectedRequest.serviceType || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">Status</label>
                  <p className="mt-1"><span className={`px-3 py-2 rounded inline-block text-sm ${statusColor(selectedRequest.status || 'pending')}`}>{(selectedRequest.status || 'Pending').charAt(0).toUpperCase() + (selectedRequest.status || 'pending').slice(1)}</span></p>
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700">Description</label>
                <p className="mt-1 px-3 py-2 bg-gray-50 rounded text-sm">{selectedRequest.description || 'No description'}</p>
              </div>
              {/* Show notes based on status - check correct field names for mobile app */}
              {(() => {
                const notesText = selectedRequest.solutionDescription || selectedRequest.actionNotes || selectedRequest.adminNotes || selectedRequest.rejectionReason;
                if (!notesText) return null;
                
                return (
                  <div className={`rounded-lg p-3 ${
                    selectedRequest.status === 'completed' 
                      ? 'bg-green-50 border border-green-200' 
                      : selectedRequest.status === 'rejected'
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-blue-50 border border-blue-200'
                  }`}>
                    <label className={`text-sm font-bold ${
                      selectedRequest.status === 'completed' 
                        ? 'text-green-800' 
                        : selectedRequest.status === 'rejected'
                        ? 'text-red-800'
                        : 'text-blue-800'
                    }`}>
                      {selectedRequest.status === 'completed' 
                        ? '✅ Resolution' 
                        : selectedRequest.status === 'rejected'
                        ? '❌ Rejection Reason'
                        : '🔄 Action Notes'}
                    </label>
                    <p className={`mt-1 text-sm ${
                      selectedRequest.status === 'completed' 
                        ? 'text-green-700' 
                        : selectedRequest.status === 'rejected'
                        ? 'text-red-700'
                        : 'text-blue-700'
                    }`}>{notesText}</p>
                  </div>
                );
              })()}
              
              {/* Show borrowed items if any */}
              {(() => {
                const requestBorrowedItems = borrowedItems.filter(item => 
                  (item.borrowerId || item.userId) === (selectedRequest.userId || selectedRequest.requestedBy) ||
                  item.serviceRequestId === selectedRequest.id
                );
                
                if (requestBorrowedItems.length > 0) {
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <label className="text-sm font-bold text-blue-800 mb-2 block">Borrowed Supplies ({requestBorrowedItems.length})</label>
                      <div className="space-y-2">
                        {requestBorrowedItems.map(item => (
                          <div key={item.id} className="bg-white rounded p-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              {item.supplyImage && (
                                <img
                                  src={item.supplyImage}
                                  alt={item.supplyName}
                                  className="w-10 h-10 rounded object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                  }}
                                />
                              )}
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{item.supplyName}</p>
                                <p className="text-xs text-gray-600">Qty: {item.quantity} • {item.status === 'pending' ? 'Pending' : item.status === 'borrowed' ? 'Borrowed' : 'Returned'}</p>
                              </div>
                            </div>
                            {(item.status === 'borrowed' || item.status === 'pending') && (
                              <button
                                onClick={() => {
                                  setShowRequestModal(false);
                                  handleMarkAsReturned(item);
                                }}
                                className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 flex items-center gap-1"
                                title="Mark as Returned"
                              >
                                <Package size={14} />
                                Return
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              
              <div className="flex gap-2 pt-2">
                {(!selectedRequest.status || selectedRequest.status === 'pending') && (
                  <>
                    <button onClick={() => openAction(selectedRequest, 'approve')} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
                      <CheckCircle size={16} /> Process Request
                    </button>
                    <button onClick={() => openAction(selectedRequest, 'reject')} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2">
                      <XCircle size={16} /> Reject
                    </button>
                  </>
                )}
                {selectedRequest.status === 'in-progress' && (
                  <button onClick={() => openAction(selectedRequest, 'complete')} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
                    <CheckCircle size={16} /> Mark as Completed
                  </button>
                )}
                <button onClick={() => setShowRequestModal(false)} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== REPORT ACTION MODAL ========== */}
      {showReportActionModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-center mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${reportActionType === 'reject' ? 'bg-red-100' : 'bg-green-100'}`}>
                {reportActionType === 'reject' ? <XCircle size={24} className="text-red-600" /> : <CheckCircle size={24} className="text-green-600" />}
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
              {reportActionType === 'action' ? 'Take Action on Report' : reportActionType === 'complete' ? 'Mark as Resolved' : 'Reject Report'}
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">Category:</p>
              <p className="font-bold text-gray-800">{selectedReport.category || 'N/A'}</p>
              <p className="text-sm text-gray-600 mt-2">Description:</p>
              <p className="text-sm text-gray-700">{selectedReport.description || 'No description'}</p>
              <p className="text-sm text-gray-600 mt-2">By: {selectedReport.reporterName || selectedReport.userName || 'Anonymous'}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {reportActionType === 'reject' ? 'Reason for Rejection (optional)' : reportActionType === 'complete' ? 'Resolution Details' : 'Action Notes (optional)'}
              </label>
              <textarea
                value={resolutionFeedback}
                onChange={(e) => setResolutionFeedback(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[100px]"
                placeholder={reportActionType === 'reject' ? 'Reason for rejection...' : reportActionType === 'complete' ? 'How was this issue resolved...' : 'Notes on actions being taken...'}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowReportActionModal(false)} className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Cancel</button>
              <button
                onClick={handleSubmitReportAction}
                className={`flex-1 px-4 py-3 text-white rounded-lg font-medium flex items-center justify-center gap-2 ${reportActionType === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {reportActionType === 'reject' ? <><XCircle size={18} />Reject</> : <><CheckCircle size={18} />Confirm</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== SERVICE REQUEST ACTION MODAL ========== */}
      {showActionModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-center mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${actionType === 'reject' ? 'bg-red-100' : 'bg-green-100'}`}>
                {actionType === 'reject' ? <XCircle size={24} className="text-red-600" /> : <CheckCircle size={24} className="text-green-600" />}
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
              {actionType === 'approve' ? 'Process Service Request' : actionType === 'complete' ? 'Mark as Completed' : 'Reject Service Request'}
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">Request:</p>
              <p className="font-bold text-gray-800">{selectedRequest.serviceType}</p>
              <p className="text-sm text-gray-600 mt-1">By: {selectedRequest.resolvedName || selectedRequest.requestedBy || 'Unknown User'}</p>
              {(selectedRequest.resolvedEmail || selectedRequest.userEmail) && (
                <p className="text-xs text-gray-500">{selectedRequest.resolvedEmail || selectedRequest.userEmail}</p>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {actionType === 'reject' ? 'Reason for Rejection (optional)' : 'Admin Notes (optional)'}
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[100px]"
                placeholder={actionType === 'reject' ? 'Reason for rejection...' : 'Notes or instructions for the requester...'}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowActionModal(false)} className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Cancel</button>
              <button
                onClick={handleSubmitAction}
                className={`flex-1 px-4 py-3 text-white rounded-lg font-medium flex items-center justify-center gap-2 ${actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {actionType === 'reject' ? <><XCircle size={18} />Reject</> : <><CheckCircle size={18} />Confirm</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== BORROWED ITEM DETAILS MODAL ========== */}
      {showBorrowedDetailsModal && selectedBorrowedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedBorrowedItem.items ? 'Borrower Details - All Items' : 'Borrowed Item Details'}
                </h2>
                <button onClick={() => setShowBorrowedDetailsModal(false)} className="text-gray-500 hover:text-gray-700 p-2 rounded-full">
                  <X size={24} />
                </button>
              </div>
              
              {/* Show all items if this is a borrower object */}
              {selectedBorrowedItem.items ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-700 font-bold text-xl">
                          {(selectedBorrowedItem.borrowerName || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-lg text-gray-900">{selectedBorrowedItem.borrowerName}</p>
                        {selectedBorrowedItem.borrowerEmail && (
                          <p className="text-sm text-gray-600">{selectedBorrowedItem.borrowerEmail}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-gray-600">Total Items</p>
                        <p className="text-lg font-bold text-gray-900">{selectedBorrowedItem.totalItems}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Pending</p>
                        <p className="text-lg font-bold text-yellow-600">{selectedBorrowedItem.statuses.pending || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Borrowed</p>
                        <p className="text-lg font-bold text-blue-600">{selectedBorrowedItem.statuses.borrowed || 0}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">#</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Item</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Qty</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Borrowed Date</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Return By</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Returned Date</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedBorrowedItem.items.map((item, idx) => (
                          <tr key={item.id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {item.supplyImage && (
                                  <img
                                    src={item.supplyImage}
                                    alt={item.supplyName}
                                    className="w-10 h-10 rounded object-cover"
                                    loading="lazy"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                )}
                                <span className="text-sm font-medium">{item.supplyName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">{item.quantity}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                              {item.borrowedAt?.toLocaleDateString() || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              <span className={isOverdue(item) ? 'text-red-600 font-medium' : 'text-gray-600'}>
                                {item.returnBy ? item.returnBy.toLocaleDateString() : '—'}
                                {isOverdue(item) && ' (Overdue)'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              {item.returnedAt
                                ? <span className="text-green-700 font-medium">
                                    {item.returnedAt.toLocaleDateString()}
                                    <span className="block text-xs text-gray-400">{item.returnedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </span>
                                : <span className="text-gray-400">—</span>
                              }
                            </td>
                            <td className="px-4 py-3">
                              {item.status === 'pending' ? (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 inline-flex items-center gap-1">
                                  <Clock size={12} />
                                  Pending
                                </span>
                              ) : item.status === 'borrowed' ? (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 inline-flex items-center gap-1">
                                  <Package size={12} />
                                  Borrowed
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 inline-flex items-center gap-1">
                                  <CheckCircle size={12} />
                                  Returned
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                {(item.status === 'borrowed' || item.status === 'pending') && (
                                  <button
                                    onClick={() => {
                                      setShowBorrowedDetailsModal(false);
                                      handleMarkAsReturned(item);
                                    }}
                                    className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                                    title="Mark as Returned"
                                  >
                                    <Package size={16} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteBorrowedItem(item)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setShowBorrowedDetailsModal(false)}
                      className="flex-1 bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
                    >
                      <X size={20} />
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Single item view */}
                  {selectedBorrowedItem.supplyImage && (
                    <img
                      src={selectedBorrowedItem.supplyImage}
                      alt={selectedBorrowedItem.supplyName}
                      className="w-full h-64 object-cover rounded-lg mb-4"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Item Name</label>
                        <p className="px-3 py-2 bg-gray-50 rounded">{selectedBorrowedItem.supplyName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Quantity Borrowed</label>
                        <p className="px-3 py-2 bg-gray-50 rounded">{selectedBorrowedItem.quantity}</p>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Borrower</label>
                      <div className="px-3 py-2 bg-gray-50 rounded">
                        <p className="font-medium">{selectedBorrowedItem.borrowerName}</p>
                        {selectedBorrowedItem.borrowerEmail && (
                          <p className="text-sm text-gray-600">{selectedBorrowedItem.borrowerEmail}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Borrowed Date</label>
                        <p className="px-3 py-2 bg-gray-50 rounded">{selectedBorrowedItem.borrowedAt.toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Expected Return Date</label>
                        <p className={`px-3 py-2 rounded ${isOverdue(selectedBorrowedItem) ? 'bg-red-50 text-red-700 font-medium' : 'bg-gray-50'}`}>
                          {selectedBorrowedItem.returnBy.toLocaleString()}
                          {isOverdue(selectedBorrowedItem) && ' (OVERDUE)'}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
                      <p className="px-3 py-2 bg-gray-50 rounded capitalize">{selectedBorrowedItem.status}</p>
                    </div>
                    
                    {selectedBorrowedItem.returnedAt && (
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Returned Date</label>
                        <p className="px-3 py-2 bg-green-50 rounded text-green-700">{selectedBorrowedItem.returnedAt.toLocaleString()}</p>
                      </div>
                    )}
                    
                    {selectedBorrowedItem.purpose && (
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Purpose</label>
                        <p className="px-3 py-2 bg-gray-50 rounded">{selectedBorrowedItem.purpose}</p>
                      </div>
                    )}
                    
                    {selectedBorrowedItem.adminNotes && (
                      <div className={`rounded-lg p-3 ${
                        selectedBorrowedItem.status === 'returned' 
                          ? 'bg-green-50 border border-green-200' 
                          : selectedBorrowedItem.status === 'rejected'
                          ? 'bg-red-50 border border-red-200'
                          : 'bg-blue-50 border border-blue-200'
                      }`}>
                        <label className={`text-sm font-bold ${
                          selectedBorrowedItem.status === 'returned' 
                            ? 'text-green-800' 
                            : selectedBorrowedItem.status === 'rejected'
                            ? 'text-red-800'
                            : 'text-blue-800'
                        }`}>
                          {selectedBorrowedItem.status === 'returned' 
                            ? '✅ Resolution' 
                            : selectedBorrowedItem.status === 'rejected'
                            ? '❌ Rejection Reason'
                            : '🔄 Action Notes'}
                        </label>
                        <p className={`mt-1 text-sm ${
                          selectedBorrowedItem.status === 'returned' 
                            ? 'text-green-700' 
                            : selectedBorrowedItem.status === 'rejected'
                            ? 'text-red-700'
                            : 'text-blue-700'
                        }`}>{selectedBorrowedItem.adminNotes}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-6">
                    {(selectedBorrowedItem.status === 'borrowed' || selectedBorrowedItem.status === 'pending') && (
                      <>
                        <button
                          onClick={() => {
                            setShowBorrowedDetailsModal(false);
                            handleMarkAsReturned(selectedBorrowedItem);
                          }}
                          className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                        >
                          <Package size={20} />
                          Mark as Returned
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDeleteBorrowedItem(selectedBorrowedItem)}
                      className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                    >
                      <Trash2 size={20} />
                      Delete
                    </button>
                    <button
                      onClick={() => setShowBorrowedDetailsModal(false)}
                      className="flex-1 bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
                    >
                      <X size={20} />
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== BORROW ITEM ACTION MODAL ========== */}
      {showBorrowActionModal && selectedBorrowedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-center mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${borrowActionType === 'reject' ? 'bg-red-100' : 'bg-green-100'}`}>
                {borrowActionType === 'reject' ? <XCircle size={24} className="text-red-600" /> : <CheckCircle size={24} className="text-green-600" />}
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
              {borrowActionType === 'approve' ? 'Approve Borrow Request' : 
               borrowActionType === 'reject' ? 'Reject Borrow Request' : 
               'Mark Item as Returned'}
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">Item:</p>
              <p className="font-bold text-gray-800">{selectedBorrowedItem.supplyName}</p>
              <p className="text-sm text-gray-600 mt-2">Borrower:</p>
              <p className="text-sm text-gray-700">{selectedBorrowedItem.borrowerName}</p>
              <p className="text-sm text-gray-600 mt-2">Quantity: {selectedBorrowedItem.quantity}</p>
              
              {borrowActionType === 'approve' && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs text-blue-800 font-medium">
                    ℹ️ Approving will immediately deduct {selectedBorrowedItem.quantity} item(s) from the Barangay Supplies inventory.
                  </p>
                </div>
              )}
              {borrowActionType === 'complete' && (
                <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded">
                  <p className="text-xs text-purple-800 font-medium">
                    ℹ️ Marking as returned will add {selectedBorrowedItem.quantity} item(s) back to inventory.
                  </p>
                </div>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Admin Notes {borrowActionType === 'complete' ? '(Optional)' : '(Recommended)'}
              </label>
              <textarea
                value={borrowAdminNotes}
                onChange={(e) => setBorrowAdminNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder={
                  borrowActionType === 'approve' ? 'Add any special instructions or conditions...' :
                  borrowActionType === 'reject' ? 'Explain reason for rejection...' :
                  'Add any notes about the return condition...'
                }
              />
              <p className="text-xs text-gray-500 mt-1">These notes will be visible to the user in their mobile app.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBorrowActionModal(false);
                  setBorrowAdminNotes('');
                }}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitBorrowAction}
                className={`flex-1 px-4 py-3 text-white rounded-lg font-medium flex items-center justify-center gap-2 ${
                  borrowActionType === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                <CheckCircle size={18} />
                {borrowActionType === 'approve' ? 'Approve' : 
                 borrowActionType === 'reject' ? 'Reject' : 
                 'Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewReports;
