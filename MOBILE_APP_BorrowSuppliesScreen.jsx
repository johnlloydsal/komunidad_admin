// ==================================================================
// MOBILE APP - Borrow Supplies Screen
// Allows users to view and borrow available barangay supplies
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
  TextInput,
  Alert,
} from 'react-native';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';

const BorrowSuppliesScreen = () => {
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState(null);
  const [borrowModalVisible, setBorrowModalVisible] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [purpose, setPurpose] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const auth = getAuth();
  const db = getFirestore();
  const currentUser = auth.currentUser;

  useEffect(() => {
    fetchSupplies();
  }, []);

  const fetchSupplies = async () => {
    setLoading(true);
    try {
      const suppliesSnapshot = await getDocs(collection(db, 'supplies'));
      const data = suppliesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // Filter to show only available items
      const availableSupplies = data.filter(supply => 
        supply.availableQuantity > 0 && supply.status === 'available'
      );
      
      setSupplies(availableSupplies);
    } catch (error) {
      console.error('Error fetching supplies:', error);
      Alert.alert('Error', 'Failed to load supplies. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSupplies();
    setRefreshing(false);
  };

  const openBorrowModal = (supply) => {
    setSelectedSupply(supply);
    setQuantity('1');
    setPurpose('');
    setReturnDate('');
    setBorrowModalVisible(true);
  };

  const validateBorrowRequest = () => {
    if (!selectedSupply) {
      Alert.alert('Error', 'No supply selected');
      return false;
    }

    const borrowQty = parseInt(quantity);
    if (!borrowQty || borrowQty < 1) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity (minimum 1)');
      return false;
    }

    if (borrowQty > selectedSupply.availableQuantity) {
      Alert.alert(
        'Insufficient Stock',
        `Only ${selectedSupply.availableQuantity} item(s) available. Cannot borrow ${borrowQty}.`
      );
      return false;
    }

    if (!purpose.trim()) {
      Alert.alert('Purpose Required', 'Please specify the purpose of borrowing this item');
      return false;
    }

    if (!returnDate.trim()) {
      Alert.alert('Return Date Required', 'Please specify when you will return the item');
      return false;
    }

    return true;
  };

  const submitBorrowRequest = async () => {
    if (!validateBorrowRequest()) {
      return;
    }

    setSubmitting(true);
    try {
      // Double-check stock availability in real-time
      const supplyRef = doc(db, 'supplies', selectedSupply.id);
      const supplyDoc = await getDoc(supplyRef);
      
      if (!supplyDoc.exists()) {
        Alert.alert('Error', 'This item is no longer available');
        setBorrowModalVisible(false);
        setSubmitting(false);
        return;
      }

      const currentStock = supplyDoc.data().availableQuantity || 0;
      const borrowQty = parseInt(quantity);

      if (currentStock < borrowQty) {
        Alert.alert(
          '❌ Insufficient Stock',
          `Sorry, only ${currentStock} item(s) are currently available. This item may have been borrowed by someone else.`
        );
        setSubmitting(false);
        // Refresh supplies to show updated stock
        fetchSupplies();
        setBorrowModalVisible(false);
        return;
      }

      // Get user details
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      // Calculate return date (parse from input or default to 7 days from now)
      const calculateReturnDate = () => {
        // Try to parse returnDate input (format: YYYY-MM-DD or MM/DD/YYYY)
        const parsedDate = new Date(returnDate);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
        // Default: 7 days from now
        const defaultReturn = new Date();
        defaultReturn.setDate(defaultReturn.getDate() + 7);
        return defaultReturn;
      };

      // Create borrow request with status 'borrowed' and deduct inventory immediately
      const borrowData = {
        userId: currentUser.uid,
        supplyId: selectedSupply.id,
        supplyName: selectedSupply.itemName,
        supplyImage: selectedSupply.imageUrl || '',
        quantity: borrowQty,
        purpose: purpose.trim(),
        borrowerName: userData.fullName || userData.displayName || currentUser.email,
        borrowerEmail: currentUser.email,
        status: 'borrowed', // Status is immediately 'borrowed'
        borrowedAt: serverTimestamp(),
        returnBy: calculateReturnDate(),
        createdAt: serverTimestamp(),
      };

      // Save borrow record
      await addDoc(collection(db, 'borrowed_supplies'), borrowData);

      // Immediately deduct from inventory
      const newAvailable = currentStock - borrowQty;
      await updateDoc(supplyRef, {
        availableQuantity: newAvailable,
        status: newAvailable > 0 ? 'available' : 'unavailable',
        updatedAt: serverTimestamp()
      });

      Alert.alert(
        '✅ Borrowed Successfully!',
        `You have successfully borrowed ${borrowQty} ${selectedSupply.itemName}. Please return by ${calculateReturnDate().toLocaleDateString()}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setBorrowModalVisible(false);
              setSelectedSupply(null);
              fetchSupplies();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting borrow request:', error);
      Alert.alert('Error', 'Failed to submit borrow request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderSupplyCard = (supply) => (
    <TouchableOpacity
      key={supply.id}
      style={styles.card}
      onPress={() => openBorrowModal(supply)}
    >
      <View style={styles.cardContent}>
        {supply.imageUrl ? (
          <Image source={{ uri: supply.imageUrl }} style={styles.supplyImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>📦</Text>
          </View>
        )}
        <View style={styles.supplyInfo}>
          <Text style={styles.itemName}>{supply.itemName}</Text>
          {supply.category && (
            <Text style={styles.category}>📁 {supply.category}</Text>
          )}
          {supply.description && (
            <Text style={styles.description} numberOfLines={2}>
              {supply.description}
            </Text>
          )}
          <View style={styles.stockContainer}>
            <Text style={styles.stockLabel}>Available: </Text>
            <Text style={styles.stockValue}>
              {supply.availableQuantity} / {supply.quantity}
            </Text>
          </View>
          <View style={styles.borrowButton}>
            <Text style={styles.borrowButtonText}>Tap to Borrow →</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderBorrowModal = () => {
    if (!selectedSupply) return null;

    return (
      <Modal
        visible={borrowModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBorrowModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Borrow {selectedSupply.itemName}</Text>

              {selectedSupply.imageUrl && (
                <Image source={{ uri: selectedSupply.imageUrl }} style={styles.modalImage} />
              )}

              <View style={styles.stockInfo}>
                <Text style={styles.stockInfoText}>
                  ✅ Available Stock: {selectedSupply.availableQuantity} items
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quantity *</Text>
                <TextInput
                  style={styles.input}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  placeholder={`Max: ${selectedSupply.availableQuantity}`}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Purpose *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={purpose}
                  onChangeText={setPurpose}
                  placeholder="Why do you need this item?"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Expected Return Date *</Text>
                <TextInput
                  style={styles.input}
                  value={returnDate}
                  onChangeText={setReturnDate}
                  placeholder="YYYY-MM-DD (e.g., 2026-03-10)"
                />
                <Text style={styles.helperText}>Format: YYYY-MM-DD or MM/DD/YYYY</Text>
              </View>

              <View style={styles.noteContainer}>
                <Text style={styles.noteTitle}>📌 Note:</Text>
                <Text style={styles.noteText}>
                  • Your request will be reviewed by the admin{'\n'}
                  • You'll receive a notification once approved{'\n'}
                  • Please return the item on time to avoid penalties
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setBorrowModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={submitBorrowRequest}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
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
      <Text style={styles.headerTitle}>Borrow Supplies</Text>
      <Text style={styles.headerSubtitle}>Request items from barangay inventory</Text>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {supplies.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>No supplies available at the moment</Text>
            <Text style={styles.emptySubtext}>Check back later or contact your barangay admin</Text>
          </View>
        ) : (
          supplies.map(renderSupplyCard)
        )}
      </ScrollView>

      {renderBorrowModal()}
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
    paddingBottom: 5,
    backgroundColor: '#FFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFF',
    margin: 15,
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 15,
  },
  supplyImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  placeholderText: {
    fontSize: 32,
  },
  supplyInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  category: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#777',
    marginBottom: 8,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockLabel: {
    fontSize: 13,
    color: '#666',
  },
  stockValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  borrowButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  borrowButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
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
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  modalImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginBottom: 15,
  },
  stockInfo: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  stockInfoText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  noteContainer: {
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFB300',
    marginBottom: 15,
  },
  noteTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 6,
  },
  noteText: {
    fontSize: 12,
    color: '#5D4037',
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#4A90E2',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BorrowSuppliesScreen;
