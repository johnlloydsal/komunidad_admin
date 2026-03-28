// ==================================================================
// MOBILE APP - My Reports & Services Screen
// Shows user's service requests and borrowed items with admin notes
// ==================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, orderBy, getDocs, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';

const MyReportsAndServicesScreen = () => {
  const [activeTab, setActiveTab] = useState('Services'); // 'Reports', 'Services', 'Borrowed Items'
  const [reports, setReports] = useState([]);
  const [services, setServices] = useState([]);
  const [borrowedItems, setBorrowedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  const auth = getAuth();
  const db = getFirestore();
  const currentUser = auth.currentUser;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      await Promise.all([
        fetchReports(),
        fetchServiceRequests(),
        fetchBorrowedItems(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const q = query(
        collection(db, 'reports'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      }));
      setReports(data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const fetchServiceRequests = async () => {
    try {
      const q = query(
        collection(db, 'service_requests'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      }));
      setServices(data);
    } catch (error) {
      console.error('Error fetching service requests:', error);
    }
  };

  const fetchBorrowedItems = async () => {
    try {
      const q = query(
        collection(db, 'borrowed_supplies'),
        where('userId', '==', currentUser.uid),
        orderBy('borrowedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      // Fetch supply details for each borrowed item
      const data = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const itemData = docSnap.data();
          let supplyName = itemData.supplyName || itemData.itemName || 'Unknown Item';
          let supplyImage = itemData.supplyImage || itemData.imageUrl || '';
          
          // Fetch supply details if supplyId exists
          if (itemData.supplyId) {
            try {
              const supplyDoc = await getDoc(doc(db, 'supplies', itemData.supplyId));
              if (supplyDoc.exists()) {
                const supplyData = supplyDoc.data();
                supplyName = supplyData.itemName || supplyName;
                supplyImage = supplyData.imageUrl || supplyImage;
              }
            } catch (err) {
              console.error('Error fetching supply:', err);
            }
          }
          
          return {
            id: docSnap.id,
            ...itemData,
            supplyName,
            supplyImage,
            borrowedAt: itemData.borrowedAt?.toDate?.() || new Date(),
            returnBy: itemData.returnBy?.toDate?.() || new Date(),
            returnedAt: itemData.returnedAt?.toDate?.() || null,
          };
        })
      );
      
      setBorrowedItems(data);
    } catch (error) {
      console.error('Error fetching borrowed items:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'resolved':
      case 'returned':
        return '#4CAF50';
      case 'in-progress':
      case 'borrowed':
      case 'pending': // Treat pending as borrowed
        return '#2196F3';
      case 'rejected':
        return '#F44336';
      default:
        return '#FF9800';
    }
  };

  const getStatusLabel = (status) => {
    if (!status) return 'Borrowed';
    if (status === 'pending') return 'Borrowed'; // Show as Borrowed
    if (status === 'in-progress') return 'Actioned'; // Show as Actioned for reports
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const showDetails = (item, type) => {
    setSelectedItem({ ...item, itemType: type });
    setDetailsModalVisible(true);
  };

  const handleDeleteBorrowedItem = async (item) => {
    Alert.alert(
      'Cancel Borrow Request',
      `Are you sure you want to cancel borrowing ${item.supplyName}? The item will be returned to inventory.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              // If item is currently borrowed/pending, restore inventory
              if ((item.status === 'borrowed' || item.status === 'pending') && item.supplyId) {
                const supplyRef = doc(db, 'supplies', item.supplyId);
                const supplyDoc = await getDoc(supplyRef);
                
                if (supplyDoc.exists()) {
                  const currentStock = supplyDoc.data().availableQuantity || 0;
                  const newAvailable = currentStock + (item.quantity || 1);
                  
                  await updateDoc(supplyRef, {
                    availableQuantity: newAvailable,
                    status: 'available',
                    updatedAt: new Date()
                  });
                }
              }
              
              // Delete the borrow record
              await deleteDoc(doc(db, 'borrowed_supplies', item.id));
              
              Alert.alert('Success', 'Borrow request cancelled and item returned to inventory');
              setDetailsModalVisible(false);
              fetchBorrowedItems(); // Refresh the list
            } catch (error) {
              console.error('Error cancelling borrowed item:', error);
              Alert.alert('Error', 'Failed to cancel borrow request');
            }
          }
        }
      ]
    );
  };

  const getServiceNotesLabel = (status) => {
    if (status === 'pending') return '⏳ Pending Approval';
    if (status === 'in-progress') return '🔄 Processing Notes:';
    if (status === 'completed') return '✅ Completion Notes:';
    if (status === 'rejected') return '❌ Rejection Reason:';
    return '📝 Admin Notes:';
  };

  const renderServiceCard = (service) => (
    <TouchableOpacity
      key={service.id}
      style={styles.card}
      onPress={() => showDetails(service, 'service')}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.serviceType}>{service.serviceType || 'Service Request'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(service.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(service.status)}</Text>
        </View>
      </View>
      
      <Text style={styles.description} numberOfLines={2}>
        {service.description || 'No description'}
      </Text>
      
      {service.adminNotes && service.status !== 'pending' && (
        <View style={styles.adminNotesContainer}>
          <Text style={styles.adminNotesLabel}>{getServiceNotesLabel(service.status)}</Text>
          <Text style={styles.adminNotesText} numberOfLines={2}>{service.adminNotes}</Text>
        </View>
      )}
      
      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>{formatDate(service.createdAt)}</Text>
        <TouchableOpacity onPress={() => showDetails(service, 'service')}>
          <Text style={styles.viewDetailsText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderBorrowedItemCard = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.card}
      onPress={() => showDetails(item, 'borrow')}
    >
      <View style={styles.borrowCardContent}>
        {item.supplyImage && (
          <Image source={{ uri: item.supplyImage }} style={styles.itemImage} />
        )}
        <View style={styles.borrowInfo}>
          <Text style={styles.itemName}>{item.supplyName}</Text>
          
          <View style={styles.metaRow}>
            <Text style={styles.metaText}># Quantity: {item.quantity || 1}</Text>
          </View>
          
          {item.purpose && (
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>📋 Purpose: {item.purpose}</Text>
            </View>
          )}
          
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>📅 Borrowed: {formatDate(item.borrowedAt)}</Text>
          </View>
          
          {item.returnBy && item.status === 'borrowed' && (
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>📆 Return By: {formatDate(item.returnBy)}</Text>
            </View>
          )}
          
          {item.adminNotes && (
            <View style={styles.adminNotesContainer}>
              <Text style={styles.adminNotesLabel}>📝 Admin Notes:</Text>
              <Text style={styles.adminNotesText} numberOfLines={2}>{item.adminNotes}</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => showDetails(item, 'borrow')}>
            <Text style={styles.viewDetailsText}>View Details</Text>
          </TouchableOpacity>
          {(item.status === 'borrowed' || item.status === 'pending') && (
            <TouchableOpacity onPress={() => handleDeleteBorrowedItem(item)}>
              <Text style={styles.deleteText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const getReportNotesLabel = (status) => {
    if (status === 'in-progress') return '🔄 Action Notes:';
    if (status === 'resolved') return '✅ Resolution:';
    if (status === 'rejected') return '❌ Rejection Reason:';
    return '📝 Notes:';
  };

  const renderReportCard = (report) => (
    <TouchableOpacity
      key={report.id}
      style={styles.card}
      onPress={() => showDetails(report, 'report')}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.serviceType}>{report.category || 'Report'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(report.status)}</Text>
        </View>
      </View>
      
      <Text style={styles.description} numberOfLines={2}>
        {report.description || 'No description'}
      </Text>
      
      {report.resolutionFeedback && (
        <View style={styles.adminNotesContainer}>
          <Text style={styles.adminNotesLabel}>{getReportNotesLabel(report.status)}</Text>
          <Text style={styles.adminNotesText} numberOfLines={2}>{report.resolutionFeedback}</Text>
        </View>
      )}
      
      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>{formatDate(report.createdAt)}</Text>
        <TouchableOpacity onPress={() => showDetails(report, 'report')}>
          <Text style={styles.viewDetailsText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderDetailsModal = () => {
    if (!selectedItem) return null;

    const { itemType } = selectedItem;

    return (
      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>
                {itemType === 'service' ? selectedItem.serviceType :
                 itemType === 'borrow' ? selectedItem.supplyName :
                 selectedItem.category}
              </Text>

              {itemType === 'borrow' && selectedItem.supplyImage && (
                <Image source={{ uri: selectedItem.supplyImage }} style={styles.modalImage} />
              )}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedItem.status) }]}>
                  <Text style={styles.statusText}>{getStatusLabel(selectedItem.status)}</Text>
                </View>
              </View>

              {itemType === 'service' && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Description:</Text>
                    <Text style={styles.detailValue}>{selectedItem.description || 'N/A'}</Text>
                  </View>
                  
                  {selectedItem.userEmail && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Email:</Text>
                      <Text style={styles.detailValue}>{selectedItem.userEmail}</Text>
                    </View>
                  )}
                  
                  {selectedItem.adminNotes && (
                    <View style={styles.adminNotesDetailContainer}>
                      <Text style={styles.adminNotesDetailLabel}>
                        {selectedItem.status === 'in-progress' ? '🔄 Processing Notes' : 
                         selectedItem.status === 'completed' ? '✅ Completion Notes' : 
                         selectedItem.status === 'rejected' ? '❌ Rejection Reason' : 
                         '📝 Admin Notes'}
                      </Text>
                      <Text style={styles.adminNotesDetailText}>{selectedItem.adminNotes}</Text>
                    </View>
                  )}
                </>
              )}

              {itemType === 'borrow' && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Quantity:</Text>
                    <Text style={styles.detailValue}>{selectedItem.quantity || 1}</Text>
                  </View>
                  
                  {selectedItem.purpose && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Purpose:</Text>
                      <Text style={styles.detailValue}>{selectedItem.purpose}</Text>
                    </View>
                  )}
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Requested:</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedItem.borrowedAt)}</Text>
                  </View>
                  
                  {selectedItem.returnBy && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Return By:</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedItem.returnBy)}</Text>
                    </View>
                  )}
                  
                  {selectedItem.returnedAt && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Returned:</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedItem.returnedAt)}</Text>
                    </View>
                  )}
                  
                  {selectedItem.adminNotes && (
                    <View style={styles.adminNotesDetailContainer}>
                      <Text style={styles.adminNotesDetailLabel}>📝 Admin Notes</Text>
                      <Text style={styles.adminNotesDetailText}>{selectedItem.adminNotes}</Text>
                    </View>
                  )}
                </>
              )}

              {itemType === 'report' && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Description:</Text>
                    <Text style={styles.detailValue}>{selectedItem.description || 'N/A'}</Text>
                  </View>
                  
                  {selectedItem.location && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Location:</Text>
                      <Text style={styles.detailValue}>{selectedItem.location}</Text>
                    </View>
                  )}
                  
                  {selectedItem.zone && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Zone:</Text>
                      <Text style={styles.detailValue}>{selectedItem.zone}</Text>
                    </View>
                  )}
                  
                  {selectedItem.imageUrl && (
                    <View style={styles.detailRow}>
                      <Image 
                        source={{ uri: selectedItem.imageUrl }} 
                        style={styles.modalImage} 
                        resizeMode="cover"
                      />
                    </View>
                  )}
                  
                  {selectedItem.resolutionFeedback && (
                    <View style={styles.adminNotesDetailContainer}>
                      <Text style={styles.adminNotesDetailLabel}>
                        {selectedItem.status === 'in-progress' ? '🔄 Action Notes' : 
                         selectedItem.status === 'resolved' ? '✅ Resolution' : 
                         selectedItem.status === 'rejected' ? '❌ Rejection Reason' : 
                         '📝 Notes'}
                      </Text>
                      <Text style={styles.adminNotesDetailText}>{selectedItem.resolutionFeedback}</Text>
                    </View>
                  )}
                </>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>{formatDate(selectedItem.createdAt || selectedItem.borrowedAt)}</Text>
              </View>
            </ScrollView>

            {selectedItem.itemType === 'borrow' && (selectedItem.status === 'borrowed' || selectedItem.status === 'pending') && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteBorrowedItem(selectedItem)}
              >
                <Text style={styles.deleteButtonText}>Cancel Borrow Request</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setDetailsModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>My Reports & Services</Text>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Reports' && styles.activeTab]}
          onPress={() => setActiveTab('Reports')}
        >
          <Text style={[styles.tabText, activeTab === 'Reports' && styles.activeTabText]}>
            Reports
          </Text>
          {reports.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{reports.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'Services' && styles.activeTab]}
          onPress={() => setActiveTab('Services')}
        >
          <Text style={[styles.tabText, activeTab === 'Services' && styles.activeTabText]}>
            Services
          </Text>
          {services.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{services.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'Borrowed Items' && styles.activeTab]}
          onPress={() => setActiveTab('Borrowed Items')}
        >
          <Text style={[styles.tabText, activeTab === 'Borrowed Items' && styles.activeTabText]}>
            Borrowed Items
          </Text>
          {borrowedItems.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{borrowedItems.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'Reports' && (
          <View style={styles.contentContainer}>
            {reports.length === 0 ? (
              <Text style={styles.emptyText}>No reports yet</Text>
            ) : (
              reports.map(renderReportCard)
            )}
          </View>
        )}

        {activeTab === 'Services' && (
          <View style={styles.contentContainer}>
            {services.length === 0 ? (
              <Text style={styles.emptyText}>No service requests yet</Text>
            ) : (
              services.map(renderServiceCard)
            )}
          </View>
        )}

        {activeTab === 'Borrowed Items' && (
          <View style={styles.contentContainer}>
            {borrowedItems.length === 0 ? (
              <Text style={styles.emptyText}>No borrowed items yet</Text>
            ) : (
              borrowedItems.map(renderBorrowedItemCard)
            )}
          </View>
        )}
      </ScrollView>

      {renderDetailsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 20,
    backgroundColor: '#FFF',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomColor: '#4A90E2',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: '#FF5252',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 15,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  serviceType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  adminNotesContainer: {
    backgroundColor: '#FFF9E6',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFB300',
    marginBottom: 10,
  },
  adminNotesLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 4,
  },
  adminNotesText: {
    fontSize: 13,
    color: '#5D4037',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 15,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  deleteText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '600',
  },
  borrowCardContent: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  borrowInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  metaRow: {
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
    marginTop: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 15,
  },
  detailRow: {
    marginBottom: 15,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 15,
    color: '#333',
  },
  adminNotesDetailContainer: {
    backgroundColor: '#FFF9E6',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB300',
    marginBottom: 15,
  },
  adminNotesDetailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 8,
  },
  adminNotesDetailText: {
    fontSize: 14,
    color: '#5D4037',
    lineHeight: 20,
  },
  deleteButton: {
    backgroundColor: '#F44336',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MyReportsAndServicesScreen;
