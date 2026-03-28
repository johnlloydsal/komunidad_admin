import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { collection, getDocs, query, orderBy, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getAuth } from 'firebase/auth';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const LostFoundScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('found'); // 'lost' or 'found'
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      // Fetch Lost Items
      const lostQuery = query(collection(db, 'lost_items'), orderBy('createdAt', 'desc'));
      const lostSnapshot = await getDocs(lostQuery);
      const lostData = await Promise.all(
        lostSnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          let reporterName = data.reporterName || data.userName || 'Unknown';
          const userId = data.userId || data.uid;

          if (userId && reporterName === 'Unknown') {
            try {
              const userDoc = await getDoc(doc(db, 'users', userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                reporterName =
                  userData.displayName ||
                  `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
                  userData.username ||
                  'Unknown';
              }
            } catch (err) {
              console.error('Error fetching user:', err);
            }
          }

          return {
            id: docSnap.id,
            ...data,
            itemName: data.itemName || data.item || data.name,
            description: data.description || data.details || '',
            location: data.location || '',
            contactInfo: data.contactInfo || '',
            status: data.status || 'lost',
            reporterName,
            imageUrl: data.imageUrl || null,
            createdAt: data.createdAt?.toDate() || new Date(),
          };
        })
      );

      // Fetch Found Items
      const foundQuery = query(collection(db, 'found_items'), orderBy('createdAt', 'desc'));
      const foundSnapshot = await getDocs(foundQuery);
      const foundData = await Promise.all(
        foundSnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          let reporterName = data.reporterName || data.userName || 'Unknown';
          const userId = data.userId || data.uid;

          if (userId && reporterName === 'Unknown') {
            try {
              const userDoc = await getDoc(doc(db, 'users', userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                reporterName =
                  userData.displayName ||
                  `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
                  userData.username ||
                  'Unknown';
              }
            } catch (err) {
              console.error('Error fetching user:', err);
            }
          }

          return {
            id: docSnap.id,
            ...data,
            itemName: data.itemName || data.item || data.name,
            description: data.description || data.details || '',
            location: data.location || '',
            contactInfo: data.contactInfo || '',
            status: data.status || 'found',
            reporterName,
            imageUrl: data.imageUrl || null,
            createdAt: data.createdAt?.toDate() || new Date(),
          };
        })
      );

      setLostItems(lostData);
      setFoundItems(foundData);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching items:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  const handleDelete = async (itemId, isList) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const collectionName = isList ? 'lost_items' : 'found_items';
              await deleteDoc(doc(db, collectionName, itemId));
              
              if (isList) {
                setLostItems(lostItems.filter((item) => item.id !== itemId));
              } else {
                setFoundItems(foundItems.filter((item) => item.id !== itemId));
              }
              
              Alert.alert('Success', 'Item deleted successfully');
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const openDetails = (item) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
  };

  const renderItem = (item, isLost) => {
    const isUserItem = item.userId === currentUser?.uid;
    const statusBadge = item.status === 'claimed' ? 'CLAIMED' : isLost ? 'LOST' : 'FOUND';
    const badgeColor = item.status === 'claimed' ? '#FF9800' : isLost ? '#F44336' : '#4CAF50';

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.itemCard}
        onPress={() => openDetails(item)}
      >
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: badgeColor }]}>
          <Text style={styles.statusText}>{statusBadge}</Text>
        </View>

        {/* Item Image */}
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Icon name="image-off" size={40} color="#ccc" />
          </View>
        )}

        {/* Item Details */}
        <View style={styles.itemDetails}>
          <Text style={styles.itemName}>{item.itemName}</Text>
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.infoRow}>
            <Icon name="account" size={14} color="#666" />
            <Text style={styles.infoText}>Reported by: {item.reporterName}</Text>
          </View>

          {item.location ? (
            <View style={styles.infoRow}>
              <Icon name="map-marker" size={14} color="#666" />
              <Text style={styles.infoText}>Location: {item.location}</Text>
            </View>
          ) : null}

          {item.contactInfo ? (
            <View style={styles.infoRow}>
              <Icon name="phone" size={14} color="#666" />
              <Text style={styles.infoText}>Contact: {item.contactInfo}</Text>
            </View>
          ) : null}

          <Text style={styles.dateText}>
            {item.createdAt.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>

        {/* Delete Button (only for user's own items) */}
        {isUserItem && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.id, isLost)}
          >
            <Icon name="delete" size={20} color="#F44336" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderDetailsModal = () => {
    if (!selectedItem) return null;

    return (
      <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Item Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {/* Image */}
              {selectedItem.imageUrl ? (
                <Image source={{ uri: selectedItem.imageUrl }} style={styles.detailImage} />
              ) : (
                <View style={styles.detailPlaceholder}>
                  <Icon name="image-off" size={60} color="#ccc" />
                  <Text style={styles.placeholderText}>No Image</Text>
                </View>
              )}

              {/* Item Info */}
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Item Name</Text>
                <Text style={styles.detailValue}>{selectedItem.itemName}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailValue}>{selectedItem.description || 'No description'}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={[styles.detailValue, { color: selectedItem.status === 'claimed' ? '#FF9800' : '#4CAF50', fontWeight: 'bold' }]}>
                  {selectedItem.status?.toUpperCase() || 'N/A'}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{selectedItem.location || 'Not specified'}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Contact Info</Text>
                <Text style={styles.detailValue}>{selectedItem.contactInfo || 'Not provided'}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Reported By</Text>
                <Text style={styles.detailValue}>{selectedItem.reporterName}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Date Reported</Text>
                <Text style={styles.detailValue}>
                  {selectedItem.createdAt.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading items...</Text>
      </View>
    );
  }

  const displayItems = activeTab === 'lost' ? lostItems : foundItems;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lost and Found</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'lost' && styles.activeTab]}
          onPress={() => setActiveTab('lost')}
        >
          <Text style={[styles.tabText, activeTab === 'lost' && styles.activeTabText]}>
            Lost Items
          </Text>
          {activeTab === 'lost' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'found' && styles.activeTab]}
          onPress={() => setActiveTab('found')}
        >
          <Text style={[styles.tabText, activeTab === 'found' && styles.activeTabText]}>
            Found Items
          </Text>
          {activeTab === 'found' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Items List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {displayItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="magnify" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No {activeTab} items yet</Text>
          </View>
        ) : (
          displayItems.map((item) => renderItem(item, activeTab === 'lost'))
        )}
      </ScrollView>

      {/* Details Modal */}
      {renderDetailsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backBtn: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 0,
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#4A90E2',
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  itemImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    padding: 15,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 5,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  deleteBtn: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  detailImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  detailPlaceholder: {
    width: '100%',
    height: 250,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
  },
  detailSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
});

export default LostFoundScreen;
